from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Any

from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from transition_engine_6x6 import (
    WHEEL_BESSEL_ROOTS,
    ArohaState,
    TransitionEngine6x6,
    pack_std140_bytes,
)

BASE_DIR = Path(__file__).resolve().parent
PARENT_DIR = BASE_DIR.parent
TIER3_VAULT_PATH = BASE_DIR / "tier3_vault.jsonl"
STREAM_HZ = 60.0

app = FastAPI(title="AROHA Master Engine v11.2 + 6x6 Tier-3 Vault", version="11.3.0")
app.mount("/shaders", StaticFiles(directory=str(BASE_DIR / "shaders")), name="shaders")
app.mount("/src", StaticFiles(directory=str(BASE_DIR / "src")), name="src")


def append_tier3_vault(state: ArohaState, faders: list[float], notes: list[int]) -> int:
    """Persists verified Point 25 -> Zone 1 elevations into tier3_vault.jsonl."""
    record = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "step": state.step_index,
        "x": round(state.x_coord, 7),
        "j0": round(state.j0_value, 9),
        "gate_action": state.gate_action,
        "states": state.to_dict()["states"],
        "metrics": state.to_dict()["metrics"],
        "cosmological_faders": [round(float(v), 3) for v in faders],
        "active_midi_chord": notes,
    }
    with TIER3_VAULT_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    return sum(1 for _ in TIER3_VAULT_PATH.open("r", encoding="utf-8"))


class SessionController:
    def __init__(self) -> None:
        self.engine = TransitionEngine6x6(
            p2=0.80,
            rgb_weights=(0.60, 0.25, 0.15),
            kappa=0.25,
            gamma_g=0.0,
        )
        self.t0 = time.perf_counter()
        self.x_coord = 0.0
        self.width = 1920.0
        self.height = 1080.0
        self.ptr_x = 0.0
        self.ptr_y = 0.0
        self.faders = [0.0] * 11
        self.active_notes: list[int] = []
        self.tier3_count = (
            sum(1 for _ in TIER3_VAULT_PATH.open("r", encoding="utf-8"))
            if TIER3_VAULT_PATH.exists()
            else 0
        )
        self.current: ArohaState = self.engine.observe(0.0)

    def elapsed(self) -> float:
        return time.perf_counter() - self.t0

    def pack_frame(self) -> bytes:
        return pack_std140_bytes(
            self.current,
            time_sec=self.elapsed(),
            width=self.width,
            height=self.height,
            ptr_x=self.ptr_x,
            ptr_y=self.ptr_y,
        )

    def apply_command(self, msg: dict[str, Any]) -> bool:
        cmd = msg.get("cmd")
        if cmd == "step":
            self.x_coord = float(msg.get("x", self.x_coord))
            action = str(msg.get("action", "hold"))
            if action not in ("hold", "confirm", "reject"):
                action = "hold"
            self.current = self.engine.step(x=self.x_coord, gate_action=action)  # type: ignore[arg-type]
            if action == "confirm" and self.current.at_point_25:
                self.tier3_count = append_tier3_vault(self.current, self.faders, self.active_notes)
            return True

        if cmd == "deadbeat":
            prev_p2 = self.engine.p2
            self.engine.p2 = 1.0
            self.engine.tiki_tilt(kappa=1.0 / 3.0, gamma_g=0.0)
            self.engine.step(x=5.0, gate_action="hold")
            self.x_coord = 8.6537279
            self.engine.step(x=self.x_coord, gate_action="hold")
            self.engine.step(x=self.x_coord, gate_action="confirm")
            self.current = self.engine.step(x=self.x_coord, gate_action="confirm")
            self.engine.p2 = prev_p2
            self.tier3_count = append_tier3_vault(self.current, self.faders, self.active_notes)
            return True

        if cmd == "faders":
            vals = msg.get("values", [])
            if len(vals) == 11:
                self.faders = [float(v) for v in vals]
                # Map planetary faders [0..6] to 6x6 parameters:
                # Saturn(0)->gamma_G, Jupiter(1)->p2, Sun(3)->kappa
                saturn, jupiter, _mars, sun = self.faders[0], self.faders[1], self.faders[2], self.faders[3]
                new_p2 = 0.50 + 0.50 * jupiter
                new_kappa = 0.10 + (0.233333 * sun)
                max_g = max(0.0, 1.0 - 2.0 * new_kappa)
                new_gamma = min(0.25 * saturn, max_g)
                self.engine.tiki_tilt(kappa=new_kappa, gamma_g=new_gamma, p2=new_p2)
                self.current.audit_metrics = self.engine.compare(self.x_coord)
            return True

        if cmd == "chord":
            notes = msg.get("notes", [])
            self.active_notes = [int(n) for n in notes]
            if self.active_notes:
                r_w = sum(((n % 12) + 1) for i, n in enumerate(self.active_notes) if i % 3 == 0) + 1.0
                g_w = sum(((n % 12) + 1) for i, n in enumerate(self.active_notes) if i % 3 == 1) + 1.0
                b_w = sum(((n % 12) + 1) for i, n in enumerate(self.active_notes) if i % 3 == 2) + 1.0
                tot = r_w + g_w + b_w
                self.engine.weights[:] = [r_w / tot, g_w / tot, b_w / tot]
                self.x_coord = 8.6537279
                if self.current.vector[2] < 0.05 and self.current.vector[1] < 0.05:
                    self.engine.step(x=5.0, gate_action="hold")
                    self.engine.step(x=8.6537279, gate_action="hold")
                self.current = self.engine.step(x=8.6537279, gate_action="confirm")
            else:
                self.current = self.engine.observe(self.x_coord)
            return True

        if cmd == "tilt":
            kappa = float(msg.get("kappa", self.engine.kappa))
            max_gamma = max(0.0, 1.0 - 2.0 * kappa)
            gamma_g = min(float(msg.get("gamma_g", self.engine.gamma_g)), max_gamma)
            self.engine.tiki_tilt(kappa=kappa, gamma_g=gamma_g)
            self.current.audit_metrics = self.engine.compare(self.x_coord)
            return True

        if cmd == "reset":
            k, g = self.engine.kappa, self.engine.gamma_g
            self.engine = TransitionEngine6x6(
                p2=0.80,
                rgb_weights=(0.60, 0.25, 0.15),
                kappa=k,
                gamma_g=g,
            )
            self.x_coord = 0.0
            self.current = self.engine.observe(0.0)
            return True

        if cmd == "viewport":
            self.width = max(1.0, float(msg.get("width", self.width)))
            self.height = max(1.0, float(msg.get("height", self.height)))
            self.ptr_x = float(msg.get("ptr_x", self.ptr_x))
            self.ptr_y = float(msg.get("ptr_y", self.ptr_y))
            return False

        return False

    def hud_payload(self) -> dict[str, Any]:
        payload = self.current.to_dict()
        payload["params"] = {
            "p2": round(self.engine.p2, 4),
            "kappa": round(self.engine.kappa, 6),
            "gamma_g": round(self.engine.gamma_g, 6),
            "tier3_vault_records": self.tier3_count,
            "stream_hz": STREAM_HZ,
        }
        return payload


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)


@app.get("/")
@app.get("/dome_preview.html")
async def serve_preview() -> FileResponse:
    return FileResponse(BASE_DIR / "dome_preview.html")


@app.get("/aroha-master-engine.html")
async def serve_original_master_engine() -> Response:
    orig = PARENT_DIR / "aroha-master-engine.html"
    if orig.exists():
        return FileResponse(orig)
    return FileResponse(BASE_DIR / "dome_preview.html")


@app.get("/api/health")
async def health_check() -> JSONResponse:
    probe = SessionController()
    raw = probe.pack_frame()
    return JSONResponse({
        "status": "ok",
        "ubo_bytes": len(raw),
        "stream_hz": STREAM_HZ,
        "target_bessel_root": probe.engine.target_root,
        "wheel_roots": WHEEL_BESSEL_ROOTS,
    })


@app.get("/api/tier3")
async def get_tier3_vault() -> JSONResponse:
    if not TIER3_VAULT_PATH.exists():
        return JSONResponse({"count": 0, "records": []})
    lines = TIER3_VAULT_PATH.read_text(encoding="utf-8").strip().splitlines()
    records = [json.loads(line) for line in lines[-20:]]
    return JSONResponse({"count": len(lines), "records": records})


@app.websocket("/ws/ubo")
async def websocket_ubo_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    session = SessionController()

    await websocket.send_text(json.dumps(session.hud_payload()))
    await websocket.send_bytes(session.pack_frame())

    stop_event = asyncio.Event()

    async def stream_binary_frames() -> None:
        interval = 1.0 / STREAM_HZ
        try:
            while not stop_event.is_set():
                await asyncio.sleep(interval)
                await websocket.send_bytes(session.pack_frame())
        except Exception:
            stop_event.set()

    streamer = asyncio.create_task(stream_binary_frames())
    try:
        while not stop_event.is_set():
            raw_text = await websocket.receive_text()
            msg = json.loads(raw_text)
            emit_hud = session.apply_command(msg)
            await websocket.send_bytes(session.pack_frame())
            if emit_hud:
                await websocket.send_text(json.dumps(session.hud_payload()))
    except WebSocketDisconnect:
        pass
    finally:
        stop_event.set()
        streamer.cancel()
