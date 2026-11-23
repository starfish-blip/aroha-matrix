// cosmicPresetUbo.js - Maps COSMIC_FREQUENCIES presets into ArohaTelemetryUBO & FastAPI telemetry state
import { telemetryUBO } from "./ArohaTelemetryUBO.js";

export const STREAM_BASE = "http://100.64.150.117:8000";

export function applyFrequencyToUBO(freqHz, chladniMode = [5, 7], ubo = telemetryUBO) {
  const freq = Number(freqHz) || 432.0;
  const m = Number(chladniMode?.[0] ?? 5);
  const n = Number(chladniMode?.[1] ?? 7);
  const nextState = {
    ...ubo.state,
    ubo_harmonic: freq,
    chladni_mode: [m, n],
  };
  ubo.state = nextState;
  ubo.writeToBuffer(nextState);
  for (const fn of ubo.listeners) {
    fn(ubo.state, ubo.buffer);
  }
  return { state: ubo.state, buffer: ubo.buffer };
}

export async function pushPresetToTelemetryApi(freqHz, chladniMode = [5, 7], baseUrl = STREAM_BASE) {
  const res = await fetch(`${baseUrl}/api/v1/portal/telemetry/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chladni_mode: chladniMode,
      ubo_harmonic: Number(freqHz),
    }),
  });
  return res.json();
}
