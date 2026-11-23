import asyncio
import json
import math
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="AROHA Portal API")

PORTAL_STATE = {
    "unlocked": False,
    "vertebrae_count": 33,
    "chladni_mode": [5, 7],
    "harmonic_lock": True,
    "focus_state": 12,
    "resonance": 0.0,
    "ubo_harmonic": 432.0,
}

class UnlockPayload(BaseModel):
    vertebrae_count: int = 33
    chladni_mode: list[int] = [5, 7]
    harmonic_lock: bool = True
    focus_state: int = 12

def _compute_telemetry_frame(tick: int = 0) -> dict:
    mode_val = PORTAL_STATE.get("chladni_mode", [5, 7])
    if isinstance(mode_val, (list, tuple)) and len(mode_val) >= 2:
        m, n = int(mode_val[0]), int(mode_val[1])
    else:
        m, n = 5, 7
    v_count = int(PORTAL_STATE.get("vertebrae_count", 33))
    v_ratio = v_count / 33.0
    lock_bonus = 0.25 if bool(PORTAL_STATE.get("harmonic_lock", True)) else 0.0
    wave = 0.5 + 0.5 * math.sin(tick * 0.35 + (m + n) * 0.2)
    resonance = round(min(1.0, (0.55 * v_ratio + 0.2 * wave + lock_bonus)), 4)
    ubo_harmonic = round(432.0 * v_ratio + (m * n) * 0.5, 3)
    PORTAL_STATE["resonance"] = resonance
    PORTAL_STATE["ubo_harmonic"] = ubo_harmonic
    return {
        "ts": datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z",
        "unlocked": bool(PORTAL_STATE.get("unlocked", False)),
        "resonance": resonance,
        "ubo_harmonic": ubo_harmonic,
        "vertebrae_count": v_count,
        "chladni_mode": [m, n],
        "harmonic_lock": bool(PORTAL_STATE.get("harmonic_lock", True)),
        "focus_state": PORTAL_STATE.get("focus_state", 12),
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "aroha-fastapi"}

@app.get("/api/v1/portal/state")
async def get_portal_state():
    return _compute_telemetry_frame(0)

@app.post("/api/v1/portal/unlock")
async def unlock_portal(payload: UnlockPayload):
    PORTAL_STATE["vertebrae_count"] = int(payload.vertebrae_count)
    PORTAL_STATE["chladni_mode"] = payload.chladni_mode[:2]
    PORTAL_STATE["harmonic_lock"] = bool(payload.harmonic_lock)
    PORTAL_STATE["focus_state"] = payload.focus_state
    PORTAL_STATE["unlocked"] = (
        int(PORTAL_STATE["vertebrae_count"]) == 33
        and bool(PORTAL_STATE["harmonic_lock"])
    )
    return _compute_telemetry_frame(0)

@app.post("/api/v1/portal/telemetry/state")
async def update_portal_telemetry_state(payload: dict):
    if "vertebrae_count" in payload:
        PORTAL_STATE["vertebrae_count"] = int(payload["vertebrae_count"])
    if "chladni_mode" in payload and isinstance(payload["chladni_mode"], list):
        PORTAL_STATE["chladni_mode"] = payload["chladni_mode"][:2]
    if "harmonic_lock" in payload:
        PORTAL_STATE["harmonic_lock"] = bool(payload["harmonic_lock"])
    if "focus_state" in payload:
        PORTAL_STATE["focus_state"] = payload["focus_state"]
    if payload.get("trigger_unlock"):
        PORTAL_STATE["unlocked"] = (
            int(PORTAL_STATE["vertebrae_count"]) == 33
            and bool(PORTAL_STATE["harmonic_lock"])
        )
    return _compute_telemetry_frame(0)

@app.get("/api/v1/portal/telemetry/stream")
async def portal_telemetry_sse(request: Request):
    async def event_generator():
        tick = 0
        while True:
            if await request.is_disconnected():
                break
            frame = _compute_telemetry_frame(tick)
            yield f"id: {tick}\nevent: telemetry\ndata: {json.dumps(frame)}\n\n"
            tick += 1
            await asyncio.sleep(1.0)
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
