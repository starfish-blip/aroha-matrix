import json
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

app = FastAPI(title="AROHA Matrix Engine", version="2.4.0")

portal_router = APIRouter(prefix="/api/v1/portal", tags=["portal"])

STATE_FILE = Path(__file__).resolve().parent / "portal_gateway_state.json"
VERIFIED_TOKEN = "aroha-33-verified"

FOCUS_OFFSETS = {
    10: 7.5,  # Theta boundary
    12: 4.0,  # Theta-Delta expanded awareness
    15: 2.5,  # Deep Delta no-time state
    21: 1.5,  # Epsilon-Delta edge threshold
}

PHASE2_MORSE_CLUES = {
    10: {"cipher_id": "P2-F10", "plaintext": "GATEWAY 10 MODE 6 8", "next_chladni": [6, 8]},
    12: {"cipher_id": "P2-F12", "plaintext": "ZENITH 26 SPINE 33", "next_chladni": [5, 7]},
    15: {"cipher_id": "P2-F15", "plaintext": "VOID DELTA MODE 7 9", "next_chladni": [7, 9]},
    21: {"cipher_id": "P2-F21", "plaintext": "AROHA OMEGA 136", "next_chladni": [4, 9]},
}


class PortalUnlockRequest(BaseModel):
    vertebrae_count: int
    chladni_mode: list[int]
    harmonic_lock: bool
    focus_state: int


class TelemetryConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)


ws_manager = TelemetryConnectionManager()


def quantize_cc_to_focus(cc_val: int) -> int:
    if cc_val < 32:
        return 10
    if cc_val < 64:
        return 12
    if cc_val < 96:
        return 15
    return 21


def build_phase2_hint(status: str | None, token: str | None, focus_state: int) -> dict | None:
    if status != "unlocked" or token != VERIFIED_TOKEN:
        return None
    clue = PHASE2_MORSE_CLUES.get(focus_state, PHASE2_MORSE_CLUES[12])
    return {
        "unlocked": True,
        "cipher_id": clue["cipher_id"],
        "plaintext": clue["plaintext"],
        "next_chladni": clue["next_chladni"],
        "harmonic_multiplier": 3,
        "wpm": 14,
    }


def read_portal_state() -> dict:
    if not STATE_FILE.exists():
        return {
            "status": "locked",
            "gateway": "zenith_26",
            "token": None,
            "resonance": {},
            "phase2_hint": None,
            "solvers": [],
        }
    data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    focus = int((data.get("resonance") or {}).get("focus_state", 12))
    data["phase2_hint"] = build_phase2_hint(data.get("status"), data.get("token"), focus)
    return data


def write_portal_state(data: dict) -> None:
    tmp_file = STATE_FILE.with_suffix(".json.tmp")
    tmp_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.replace(tmp_file, STATE_FILE)


def persist_portal_unlock(
    vertebrae_count: int,
    chladni_mode: list[int],
    harmonic_lock: bool,
    focus_state: int,
    source: str = "http",
) -> dict:
    if vertebrae_count != 33 or not harmonic_lock:
        return {"status": "locked", "signal": "dissonance_detected", "phase2_hint": None}

    carrier_hz = round(136.1 * (vertebrae_count / 33.0), 2)
    binaural_offset_hz = FOCUS_OFFSETS.get(focus_state, 4.0)
    now_utc = datetime.now(timezone.utc).isoformat()
    phase2_hint = build_phase2_hint("unlocked", VERIFIED_TOKEN, focus_state)

    current = read_portal_state()
    resonance = {
        "vertebrae_count": vertebrae_count,
        "chladni_mode": chladni_mode,
        "harmonic_lock": harmonic_lock,
        "focus_state": focus_state,
        "carrier_hz": carrier_hz,
        "binaural_offset_hz": binaural_offset_hz,
    }

    solvers = current.get("solvers", [])
    solvers.append(
        {
            "unlocked_at_utc": now_utc,
            "gateway": "zenith_26",
            "source": source,
            "chladni_mode": chladni_mode,
            "focus_state": focus_state,
            "carrier_hz": carrier_hz,
            "binaural_offset_hz": binaural_offset_hz,
        }
    )

    updated = {
        "status": "unlocked",
        "gateway": "zenith_26",
        "token": VERIFIED_TOKEN,
        "last_unlocked_utc": now_utc,
        "resonance": resonance,
        "phase2_hint": phase2_hint,
        "solvers": solvers[-50:],
    }
    write_portal_state(updated)

    return {
        "type": "portal_state",
        "source": source,
        "status": "unlocked",
        "gateway": "zenith_26",
        "token": VERIFIED_TOKEN,
        "resonance": resonance,
        "phase2_hint": phase2_hint,
        "ledger_count": len(updated["solvers"]),
    }


@portal_router.get("/state")
async def get_portal_state():
    return read_portal_state()


@portal_router.post("/unlock")
async def unlock_portal(payload: PortalUnlockRequest):
    result = persist_portal_unlock(
        vertebrae_count=payload.vertebrae_count,
        chladni_mode=payload.chladni_mode,
        harmonic_lock=payload.harmonic_lock,
        focus_state=payload.focus_state,
        source="http",
    )
    if result.get("status") == "unlocked":
        await ws_manager.broadcast(result)
    return result


@app.websocket("/ws")
async def telemetry_ws(ws: WebSocket):
    await ws_manager.connect(ws)
    await ws.send_json({"type": "portal_state", "source": "sync", **read_portal_state()})
    try:
        while True:
            msg = await ws.receive_json()
            focus = msg.get("focus_state")
            if focus is None and "value" in msg:
                focus = quantize_cc_to_focus(int(msg["value"]))
            if focus is not None:
                current = read_portal_state()
                prev_res = current.get("resonance") or {}
                result = persist_portal_unlock(
                    vertebrae_count=int(msg.get("vertebrae_count", prev_res.get("vertebrae_count", 33))),
                    chladni_mode=list(msg.get("chladni_mode", prev_res.get("chladni_mode", [5, 7]))),
                    harmonic_lock=bool(msg.get("harmonic_lock", prev_res.get("harmonic_lock", True))),
                    focus_state=int(focus),
                    source=str(msg.get("source", "ws")),
                )
                if result.get("status") == "unlocked":
                    await ws_manager.broadcast(result)
                else:
                    await ws.send_json(result)
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


app.include_router(portal_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "aroha-fastapi"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)