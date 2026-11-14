import asyncio
import json
import math
import time
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

app = FastAPI(title="AROHA FastAPI Backend - Maramataka & Telemetry Engine")

SYNODIC_MONTH = 29.530588853
KNOWN_NEW_MOON_EPOCH = 1794207720.0  # 2026-11-09 07:02:00 UTC

# 30 Traditional Maramataka Nights: (Name, Energy Index 0.0-1.0, Target Binaural Delta Hz, Description)
MARAMATAKA_NIGHTS = [
    ("Whiro", 0.15, 2.5, "New Moon - dark, inward rest and reset"),
    ("Tirea", 0.25, 3.5, "Slender crescent emerging - quiet planning"),
    ("Hoata", 0.45, 4.5, "Growing clarity - calm foundational work"),
    ("Ouenuku", 0.65, 6.0, "Rising momentum - productive action"),
    ("Okoro", 0.70, 6.5, "Steady flow - creative alignment"),
    ("Tamatea-a-ngana", 0.40, 10.0, "Unpredictable currents - turbulent shift"),
    ("Tamatea-aio", 0.55, 7.83, "Calming waters - balance returning"),
    ("Tamatea-a-hotu", 0.35, 11.0, "Agitated undercurrents - hold steady"),
    ("Tamatea-whakapau", 0.50, 8.5, "Clearing transition - release tension"),
    ("Huna", 0.25, 4.0, "Hidden energy - introspection"),
    ("Ariroa", 0.60, 7.0, "Renewed visibility - good for gathering"),
    ("Mawharu", 0.85, 7.83, "Abundant flow - high creative resonance"),
    ("Ohua", 0.80, 8.0, "Ripening phase - strong focus"),
    ("Atua-whakahaehae", 0.30, 12.0, "Sharp dissonance - avoid major launches"),
    ("Turumahara", 0.90, 7.83, "Waxing fullness - peak preparation"),
    ("Rakaunui", 1.00, 7.83, "Full Moon - maximum illumination and resonance"),
    ("Rakau-matohi", 0.92, 7.5, "Sustained fullness - deep integration"),
    ("Takirau", 0.75, 6.8, "Early waning - sharing and distribution"),
    ("Oike", 0.50, 5.5, "Settling energy - maintenance"),
    ("Korekore-te-whiwhia", 0.25, 3.8, "Low yield phase - conserve bandwidth"),
    ("Korekore-te-rawea", 0.20, 3.2, "Quiet void - analytical review"),
    ("Korekore-piri-ki-nga-Tangaroa", 0.45, 5.0, "Transitioning toward Tangaroa"),
    ("Tangaroa-a-mua", 0.88, 7.83, "First Tangaroa - high vitality and clarity"),
    ("Tangaroa-a-roto", 0.92, 7.83, "Deep Tangaroa - peak synchronicity"),
    ("Tangaroa-kiokio", 0.95, 8.2, "Crystalline Tangaroa - clear mastery"),
    ("Otane", 0.80, 6.5, "Generative warmth - grounded completion"),
    ("Orongonui", 0.85, 7.0, "Harmonic peace - acoustic resonance"),
    ("Mauri", 0.40, 4.2, "Waning crescent - quiet reflection"),
    ("Omutu", 0.20, 3.0, "Closing cycle - stillness"),
    ("Mutuwhenua", 0.10, 2.0, "Darkest night - deep renewal")
]

telemetry_state = {
    "thermal_temp": 36.6,
    "chladni_freq": 432.0,
    "binaural_delta": 7.83,
    "auto_lunar": True,
    "override_lunar_day": 0  # 0 = live astronomical clock, 1..30 = manual test override
}

def compute_maramataka_state(now_ts: float = None) -> dict:
    if now_ts is None:
        now_ts = time.time()

    override_day = int(telemetry_state.get("override_lunar_day", 0))
    if 1 <= override_day <= 30:
        day_index = override_day - 1
        phase_ratio = (day_index + 0.5) / 30.0
        lunar_age = phase_ratio * SYNODIC_MONTH
    else:
        elapsed = (now_ts - KNOWN_NEW_MOON_EPOCH) / 86400.0
        lunar_age = elapsed % SYNODIC_MONTH
        phase_ratio = lunar_age / SYNODIC_MONTH
        day_index = min(29, max(0, int(math.floor(phase_ratio * 30.0))))

    illumination = 0.5 * (1.0 - math.cos(2.0 * math.pi * phase_ratio))
    name, energy, target_delta, desc = MARAMATAKA_NIGHTS[day_index]

    # AROHA Thermal Resonator: dT = T - 36.6, f_T = 261.63 * 2^(dT / 12)
    temp = float(telemetry_state["thermal_temp"])
    delta_t = temp - 36.6
    thermal_freq = 261.63 * math.pow(2.0, delta_t / 12.0)

    # In auto_lunar mode, modulate carrier & binaural delta by Maramataka harmonic state
    if telemetry_state.get("auto_lunar", True):
        harmonic_carrier = round(thermal_freq * (1.0 + 0.65 * energy), 2)
        binaural_delta = target_delta
    else:
        harmonic_carrier = float(telemetry_state["chladni_freq"])
        binaural_delta = float(telemetry_state["binaural_delta"])

    return {
        "maramataka_phase": name,
        "maramataka_desc": desc,
        "lunar_day": day_index + 1,
        "lunar_age_days": round(lunar_age, 2),
        "lunar_illumination": round(illumination, 4),
        "lunar_energy": round(energy, 3),
        "thermal_temp": round(temp, 2),
        "thermal_freq": round(thermal_freq, 2),
        "chladni_freq": harmonic_carrier,
        "binaural_delta": round(binaural_delta, 2),
        "auto_lunar": bool(telemetry_state.get("auto_lunar", True)),
        "override_lunar_day": override_day,
        "timestamp": now_ts
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aroha-fastapi"}

@app.get("/maramataka")
def get_maramataka():
    return compute_maramataka_state()


@app.post("/telemetry/reset")
def reset_telemetry():
    telemetry_state["thermal_temp"] = 36.6
    telemetry_state["chladni_freq"] = 432.0
    telemetry_state["binaural_delta"] = 7.83
    telemetry_state["auto_lunar"] = True
    telemetry_state["override_lunar_day"] = 0
    return compute_maramataka_state()

@app.get("/telemetry")
def get_telemetry():
    return compute_maramataka_state()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_json({
            "status": "connected",
            "service": "aroha-fastapi-ws",
            **compute_maramataka_state()
        })
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                try:
                    payload = json.loads(raw)
                    for key in ("thermal_temp", "chladni_freq", "binaural_delta", "auto_lunar", "override_lunar_day"):
                        if key in payload:
                            telemetry_state[key] = payload[key]
                except ValueError:
                    pass
                await websocket.send_json({
                    "status": "updated",
                    "service": "aroha-fastapi-ws",
                    **compute_maramataka_state()
                })
            except asyncio.TimeoutError:
                t = time.time()
                state_snapshot = compute_maramataka_state(t)
                # Subtle micro-oscillation on thermal temp for organic standing wave breathing
                state_snapshot["thermal_temp"] = round(
                    state_snapshot["thermal_temp"] + math.sin(t * 0.4) * 0.15, 2
                )
                await websocket.send_json({
                    "status": "streaming",
                    "service": "aroha-fastapi-ws",
                    **state_snapshot
                })
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000)









