import json
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title="AROHA Matrix Engine", version="2.6.0")

portal_router = APIRouter(prefix="/api/v1/portal", tags=["portal"])

STATE_FILE = Path(__file__).resolve().parent / "portal_gateway_state.json"
VERIFIED_TOKEN = "aroha-33-verified"
PHASE2_ZENITH_TOKEN = "aroha-zenith-26-master"
PHASE3_CROWN_TOKEN = "aroha-crown-33-starmap"
PHASE2_EIGENMODE_SEQUENCE = [[5, 7], [6, 8], [7, 9], [4, 9]]

FOCUS_OFFSETS = {
    10: 7.5,  # Theta boundary
    12: 4.0,  # Theta-Delta expanded awareness
    15: 2.5,  # Deep Delta no-time state
    21: 1.5,  # Epsilon-Delta edge threshold
}

PHASE2_MORSE_CLUES = {
    10: {"cipher_id": "P2-F10", "plaintext": "GATEWAY 10 SEQ 5 7 6 8"},
    12: {"cipher_id": "P2-F12", "plaintext": "ZENITH 26 SPINE 33"},
    15: {"cipher_id": "P2-F15", "plaintext": "VOID DELTA SEQ 7 9 4 9"},
    21: {"cipher_id": "P2-F21", "plaintext": "AROHA OMEGA 136"},
}


class PortalUnlockRequest(BaseModel):
    vertebrae_count: int
    chladni_mode: list[int]
    harmonic_lock: bool
    focus_state: int
    reset_sequence: bool = False


class Phase3CrownRequest(BaseModel):
    phase2_token: str | None = None


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


def default_phase2_progression() -> dict:
    return {
        "target_sequence": PHASE2_EIGENMODE_SEQUENCE,
        "step_index": 0,
        "total_steps": len(PHASE2_EIGENMODE_SEQUENCE),
        "matched_modes": [],
        "next_expected_mode": PHASE2_EIGENMODE_SEQUENCE[0],
        "phase2_status": "awaiting_sequence",
        "phase2_token": None,
        "zenith_unlocked_utc": None,
    }


def evaluate_phase2_progression(
    prev_prog: dict | None,
    mode: list[int],
    reset_sequence: bool,
    now_utc: str,
) -> dict:
    seq = PHASE2_EIGENMODE_SEQUENCE
    total = len(seq)
    normalized_mode = [int(mode[0]), int(mode[1])] if len(mode) >= 2 else [0, 0]

    if reset_sequence or not isinstance(prev_prog, dict):
        base = default_phase2_progression()
    else:
        base = {
            "target_sequence": seq,
            "step_index": int(prev_prog.get("step_index", 0)),
            "total_steps": total,
            "matched_modes": list(prev_prog.get("matched_modes", [])),
            "next_expected_mode": prev_prog.get("next_expected_mode", seq[0]),
            "phase2_status": prev_prog.get("phase2_status", "awaiting_sequence"),
            "phase2_token": prev_prog.get("phase2_token"),
            "zenith_unlocked_utc": prev_prog.get("zenith_unlocked_utc"),
        }

    if base["phase2_status"] == "zenith_unlocked" and base["phase2_token"] == PHASE2_ZENITH_TOKEN:
        base["step_index"] = total
        base["matched_modes"] = [list(m) for m in seq]
        base["next_expected_mode"] = None
        return base

    idx = max(0, min(base["step_index"], total))

    if idx < total and normalized_mode == seq[idx]:
        idx += 1
        matched = [list(m) for m in seq[:idx]]
    elif idx > 0 and normalized_mode == seq[idx - 1]:
        matched = [list(m) for m in seq[:idx]]
    elif normalized_mode == seq[0]:
        idx = 1
        matched = [list(seq[0])]
    else:
        idx = 0
        matched = []

    if idx >= total:
        return {
            "target_sequence": seq,
            "step_index": total,
            "total_steps": total,
            "matched_modes": [list(m) for m in seq],
            "next_expected_mode": None,
            "phase2_status": "zenith_unlocked",
            "phase2_token": PHASE2_ZENITH_TOKEN,
            "zenith_unlocked_utc": now_utc,
        }

    return {
        "target_sequence": seq,
        "step_index": idx,
        "total_steps": total,
        "matched_modes": matched,
        "next_expected_mode": list(seq[idx]),
        "phase2_status": "in_progress" if idx > 0 else "awaiting_sequence",
        "phase2_token": None,
        "zenith_unlocked_utc": None,
    }


def build_phase2_hint(
    status: str | None,
    token: str | None,
    focus_state: int,
    progression: dict,
) -> dict | None:
    if status != "unlocked" or token != VERIFIED_TOKEN:
        return None

    if progression.get("phase2_status") == "zenith_unlocked":
        return {
            "unlocked": True,
            "cipher_id": "P2-ZENITH",
            "plaintext": "ZENITH 26 CROWN UNLOCKED",
            "next_chladni": None,
            "harmonic_multiplier": 3,
            "wpm": 16,
        }

    clue = PHASE2_MORSE_CLUES.get(focus_state, PHASE2_MORSE_CLUES[12])
    next_mode = progression.get("next_expected_mode") or PHASE2_EIGENMODE_SEQUENCE[0]
    return {
        "unlocked": True,
        "cipher_id": clue["cipher_id"],
        "plaintext": f"{clue['plaintext']} NEXT {next_mode[0]} {next_mode[1]}",
        "next_chladni": next_mode,
        "harmonic_multiplier": 3,
        "wpm": 14,
    }


def build_phase3_crown_payload(resonance: dict, unlocked_utc: str) -> dict:
    carrier_hz = float(resonance.get("carrier_hz", 136.1))
    offset_hz = float(resonance.get("binaural_offset_hz", 1.5))
    focus_state = int(resonance.get("focus_state", 21))
    mode = resonance.get("chladni_mode") or [4, 9]

    return {
        "phase3_status": "crown_manifested",
        "phase3_token": PHASE3_CROWN_TOKEN,
        "manifested_utc": unlocked_utc,
        "star_map_coordinates": {
            "sector": "CRUX-CENTAURUS-ZENITH-26",
            "ra_hours": 13.33,
            "dec_deg": -41.21,
            "azimuth_deg": 33.0,
            "elevation_deg": 26.0,
            "maramataka_phase": "Rākaunui Waxing Gibbous Ascent",
            "next_supermoon_utc": "2026-11-24T14:53:00Z",
            "resonance_node": "starmaps13://zenith-26/vertebrae-33",
        },
        "synth_preset": {
            "preset_name": "AROHA Zenith-26 Crown Harmonic Matrix",
            "engine_target": "PortalBinauralEngine / WebAudio-std140",
            "fundamental_carrier_hz": carrier_hz,
            "dichotic_left_hz": round(carrier_hz - offset_hz / 2.0, 3),
            "dichotic_right_hz": round(carrier_hz + offset_hz / 2.0, 3),
            "binaural_delta_hz": offset_hz,
            "morse_overtone_hz": round(carrier_hz * 3.0, 2),
            "gateway_focus_state": focus_state,
            "harmonic_ratios": [1.0, 1.5, 2.0, 3.0, 4.5, 6.0],
            "chladni_eigenmodes": PHASE2_EIGENMODE_SEQUENCE,
            "std140_u_harmonic_vec4": [float(mode[0]), float(mode[1]), carrier_hz, offset_hz],
        },
    }


def read_portal_state() -> dict:
    if not STATE_FILE.exists():
        prog = default_phase2_progression()
        return {
            "status": "locked",
            "gateway": "zenith_26",
            "token": None,
            "phase2_token": None,
            "phase3_token": None,
            "resonance": {},
            "phase2_progression": prog,
            "phase2_hint": None,
            "phase3_crown": None,
            "solvers": [],
        }

    data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    focus = int((data.get("resonance") or {}).get("focus_state", 12))
    prog = data.get("phase2_progression") or default_phase2_progression()
    data["phase2_progression"] = prog
    data["phase2_token"] = prog.get("phase2_token")
    data["phase2_hint"] = build_phase2_hint(data.get("status"), data.get("token"), focus, prog)
    if prog.get("phase2_status") != "zenith_unlocked":
        data["phase3_token"] = None
        data["phase3_crown"] = None
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
    reset_sequence: bool = False,
) -> dict:
    if vertebrae_count != 33 or not harmonic_lock:
        return {
            "status": "locked",
            "signal": "dissonance_detected",
            "phase2_token": None,
            "phase3_token": None,
            "phase2_hint": None,
        }

    normalized_mode = [int(chladni_mode[0]), int(chladni_mode[1])] if len(chladni_mode) >= 2 else [5, 7]
    carrier_hz = round(136.1 * (vertebrae_count / 33.0), 2)
    binaural_offset_hz = FOCUS_OFFSETS.get(focus_state, 4.0)
    now_utc = datetime.now(timezone.utc).isoformat()

    current = read_portal_state()
    progression = evaluate_phase2_progression(
        prev_prog=current.get("phase2_progression"),
        mode=normalized_mode,
        reset_sequence=reset_sequence,
        now_utc=now_utc,
    )
    phase2_token = progression.get("phase2_token")
    phase2_hint = build_phase2_hint("unlocked", VERIFIED_TOKEN, focus_state, progression)

    phase3_crown = current.get("phase3_crown") if phase2_token == PHASE2_ZENITH_TOKEN else None
    phase3_token = current.get("phase3_token") if phase2_token == PHASE2_ZENITH_TOKEN else None

    resonance = {
        "vertebrae_count": vertebrae_count,
        "chladni_mode": normalized_mode,
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
            "chladni_mode": normalized_mode,
            "focus_state": focus_state,
            "carrier_hz": carrier_hz,
            "binaural_offset_hz": binaural_offset_hz,
            "phase2_step": f"{progression['step_index']}/{progression['total_steps']}",
            "phase2_status": progression["phase2_status"],
        }
    )

    updated = {
        "status": "unlocked",
        "gateway": "zenith_26",
        "token": VERIFIED_TOKEN,
        "phase2_token": phase2_token,
        "phase3_token": phase3_token,
        "last_unlocked_utc": now_utc,
        "resonance": resonance,
        "phase2_progression": progression,
        "phase2_hint": phase2_hint,
        "phase3_crown": phase3_crown,
        "solvers": solvers[-50:],
    }
    write_portal_state(updated)

    return {
        "type": "portal_state",
        "source": source,
        "status": "unlocked",
        "gateway": "zenith_26",
        "token": VERIFIED_TOKEN,
        "phase2_token": phase2_token,
        "phase3_token": phase3_token,
        "resonance": resonance,
        "phase2_progression": progression,
        "phase2_hint": phase2_hint,
        "phase3_crown": phase3_crown,
        "ledger_count": len(updated["solvers"]),
    }


def _verify_zenith_access(provided_token: str | None) -> dict:
    current = read_portal_state()
    prog = current.get("phase2_progression") or {}
    if (
        provided_token != PHASE2_ZENITH_TOKEN
        or prog.get("phase2_status") != "zenith_unlocked"
        or current.get("phase2_token") != PHASE2_ZENITH_TOKEN
    ):
        raise HTTPException(
            status_code=403,
            detail="Phase 3 Crown locked: requires completed 4-step eigenmode sequence and valid aroha-zenith-26-master token.",
        )
    return current


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
        reset_sequence=payload.reset_sequence,
    )
    if result.get("status") == "unlocked":
        await ws_manager.broadcast(result)
    return result


@portal_router.post("/phase3/crown")
async def manifest_phase3_crown(
    body: Phase3CrownRequest | None = None,
    x_zenith_token: str | None = Header(default=None),
):
    supplied = (body.phase2_token if body else None) or x_zenith_token
    current = _verify_zenith_access(supplied)
    now_utc = datetime.now(timezone.utc).isoformat()
    crown = build_phase3_crown_payload(current.get("resonance") or {}, now_utc)

    current["phase3_token"] = crown["phase3_token"]
    current["phase3_crown"] = crown
    write_portal_state(current)

    broadcast_msg = {
        "type": "portal_state",
        "source": "phase3-crown",
        **current,
    }
    await ws_manager.broadcast(broadcast_msg)
    return broadcast_msg


@portal_router.get("/phase3/preset.json")
async def download_phase3_synth_preset(
    token: str | None = Query(default=None),
    x_zenith_token: str | None = Header(default=None),
):
    supplied = token or x_zenith_token
    current = _verify_zenith_access(supplied)
    crown = current.get("phase3_crown") or build_phase3_crown_payload(
        current.get("resonance") or {},
        datetime.now(timezone.utc).isoformat(),
    )
    preset_json = json.dumps(
        {
            "gateway": "zenith_26",
            "phase3_token": crown["phase3_token"],
            "star_map_coordinates": crown["star_map_coordinates"],
            "synth_preset": crown["synth_preset"],
        },
        indent=2,
    )
    return Response(
        content=preset_json,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="aroha-zenith-26-synth-preset.json"'},
    )


@app.websocket("/ws")
async def telemetry_ws(ws: WebSocket):
    await ws_manager.connect(ws)
    await ws.send_json({"type": "portal_state", "source": "sync", **read_portal_state()})
    try:
        while True:
            msg = await ws.receive_json()
            current = read_portal_state()
            prev_res = current.get("resonance") or {}

            focus = msg.get("focus_state")
            if focus is None and "value" in msg:
                focus = quantize_cc_to_focus(int(msg["value"]))
            if focus is None and ("chladni_mode" in msg or msg.get("reset_sequence")):
                focus = int(prev_res.get("focus_state", 12))

            if focus is not None:
                result = persist_portal_unlock(
                    vertebrae_count=int(msg.get("vertebrae_count", prev_res.get("vertebrae_count", 33))),
                    chladni_mode=list(msg.get("chladni_mode", prev_res.get("chladni_mode", [5, 7]))),
                    harmonic_lock=bool(msg.get("harmonic_lock", prev_res.get("harmonic_lock", True))),
                    focus_state=int(focus),
                    source=str(msg.get("source", "ws")),
                    reset_sequence=bool(msg.get("reset_sequence", False)),
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