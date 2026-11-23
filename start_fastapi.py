import uvicorn

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")

# --- AROHA SSE Telemetry & UBO Bridge Endpoint ---
import asyncio
import json
import time
from typing import Any, Dict
from fastapi import Body
from fastapi.responses import StreamingResponse

try:
    app  # noqa: F821
except NameError:
    from fastapi import FastAPI
    app = FastAPI(title="AROHA Matrix Telemetry API")

_AROHA_TELEMETRY_STATE: Dict[str, Any] = {
    "carrierHz": 432.0,
    "beatDeltaHz": 6.0,
    "thermalTempC": 36.6,
    "lunarPhase": 0.0,
    "chladniN": 3.0,
    "chladniM": 5.0,
    "filterCutoffHz": 1800.0,
    "resonanceQ": 1.414,
    "jupiterGain": 0.75,
    "saturnGain": 0.65,
    "sigilCharge": 0.0,
    "timeSec": 0.0,
    "updatedAt": time.time(),
}

@app.get("/api/v1/portal/telemetry")
async def get_aroha_telemetry() -> Dict[str, Any]:
    _AROHA_TELEMETRY_STATE["updatedAt"] = time.time()
    return _AROHA_TELEMETRY_STATE

@app.post("/api/v1/portal/telemetry")
async def post_aroha_telemetry(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    for k, v in payload.items():
        if k in _AROHA_TELEMETRY_STATE and isinstance(v, (int, float)):
            _AROHA_TELEMETRY_STATE[k] = float(v)
    _AROHA_TELEMETRY_STATE["updatedAt"] = time.time()
    return {"ok": True, "telemetry": _AROHA_TELEMETRY_STATE}

@app.get("/api/v1/portal/telemetry/stream")
async def stream_aroha_telemetry(interval_sec: float = 1.0) -> StreamingResponse:
    safe_interval = max(0.2, min(10.0, float(interval_sec)))

    async def event_generator():
        t0 = time.monotonic()
        while True:
            _AROHA_TELEMETRY_STATE["timeSec"] = round(time.monotonic() - t0, 3)
            _AROHA_TELEMETRY_STATE["updatedAt"] = time.time()
            frame = json.dumps(_AROHA_TELEMETRY_STATE)
            yield f"event: telemetry\ndata: {frame}\n\n"
            await asyncio.sleep(safe_interval)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
