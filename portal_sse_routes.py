import asyncio
import json
import math
import time
from typing import Any, Dict
from fastapi import APIRouter, Body, Request
from fastapi.responses import StreamingResponse

router = APIRouter()

_PORTAL_STATE: Dict[str, Any] = {
    "ts": time.strftime("%H:%M:%S.000Z", time.gmtime()),
    "unlocked": True,
    "resonance": 0.9675,
    "ubo_harmonic": 449.5,
    "carrierHz": 449.5,
    "beatDeltaHz": 6.0,
    "thermalTempC": 36.6,
    "thermal_temp": 36.6,
    "thermal_freq": 261.63,
    "lunarPhase": 0.5,
    "lunar_day": 16,
    "maramataka_phase": "Rakaunui",
    "vertebrae_count": 33,
    "chladni_mode": [5, 7],
    "chladniN": 5.0,
    "chladniM": 7.0,
    "harmonic_lock": True,
    "focus_state": 12,
    "sigilCharge": 0.0,
}

def _stamp() -> str:
    now = time.time()
    ms = int((now - int(now)) * 1000)
    return time.strftime("%H:%M:%S", time.gmtime(now)) + f".{ms:03d}Z"

@router.post("/api/telemetry/reset")
async def reset_telemetry() -> Dict[str, Any]:
    _PORTAL_STATE["thermalTempC"] = 36.6
    _PORTAL_STATE["thermal_temp"] = 36.6
    _PORTAL_STATE["thermal_freq"] = 261.63
    _PORTAL_STATE["lunar_day"] = 16
    _PORTAL_STATE["maramataka_phase"] = "Rakaunui"
    _PORTAL_STATE["ts"] = _stamp()
    return {"ok": True, "status": "reset", "thermal_temp": 36.6, "thermal_freq": 261.63}

@router.get("/api/maramataka")
async def get_maramataka() -> Dict[str, Any]:
    _PORTAL_STATE["ts"] = _stamp()
    return {
        "maramataka_phase": _PORTAL_STATE["maramataka_phase"],
        "lunar_day": _PORTAL_STATE["lunar_day"],
        "lunar_phase": _PORTAL_STATE["lunarPhase"],
        "thermal_temp": _PORTAL_STATE["thermal_temp"],
        "thermal_freq": _PORTAL_STATE["thermal_freq"],
        "ts": _PORTAL_STATE["ts"],
    }

@router.post("/api/v1/portal/telemetry/state")
@router.post("/api/v1/portal/telemetry")
async def post_portal_telemetry(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    for k, v in payload.items():
        if isinstance(v, (int, float, bool, list, str)):
            _PORTAL_STATE[k] = v
    if "carrierHz" in payload and "ubo_harmonic" not in payload:
        _PORTAL_STATE["ubo_harmonic"] = float(payload["carrierHz"])
    if "ubo_harmonic" in payload and "carrierHz" not in payload:
        _PORTAL_STATE["carrierHz"] = float(payload["ubo_harmonic"])
    if "chladniN" in payload or "chladniM" in payload:
        n_val = int(payload.get("chladniN", _PORTAL_STATE.get("chladniN", 5)))
        m_val = int(payload.get("chladniM", _PORTAL_STATE.get("chladniM", 7)))
        _PORTAL_STATE["chladni_mode"] = [n_val, m_val]
    _PORTAL_STATE["ts"] = _stamp()
    return {"ok": True, "telemetry": _PORTAL_STATE}

@router.get("/api/v1/portal/telemetry/stream")
async def portal_telemetry_sse(request: Request, interval_sec: float = 1.0):
    async def event_generator():
        seq = 0
        while not await request.is_disconnected():
            _PORTAL_STATE["ts"] = _stamp()
            _PORTAL_STATE["resonance"] = round(0.9 + 0.1 * math.sin(time.time() * 0.4), 4)
            frame = {
                "ts": _PORTAL_STATE["ts"],
                "unlocked": _PORTAL_STATE["unlocked"],
                "resonance": _PORTAL_STATE["resonance"],
                "ubo_harmonic": _PORTAL_STATE["ubo_harmonic"],
                "vertebrae_count": _PORTAL_STATE["vertebrae_count"],
                "chladni_mode": _PORTAL_STATE["chladni_mode"],
                "harmonic_lock": _PORTAL_STATE["harmonic_lock"],
                "focus_state": _PORTAL_STATE["focus_state"],
            }
            yield f"id: {seq}\nevent: telemetry\ndata: {json.dumps(frame)}\n\n"
            seq += 1
            await asyncio.sleep(max(0.1, interval_sec))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Private-Network": "true",
        },
    )