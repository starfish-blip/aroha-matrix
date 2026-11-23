// consciousnessUboBridge.js - Maps NeuralConsciousness state into ArohaTelemetryUBO
import { telemetryUBO } from "./ArohaTelemetryUBO.js";

const STATE_TO_FOCUS_CODE = {
  normal: 1,
  focused: 2,
  meditation: 4,
  awakened: 8,
  transcendence: 12,
};

export function syncNeuralConsciousnessToUBO(ncState, ubo = telemetryUBO) {
  const awareness = Number(ncState?.awareness ?? 0.5);
  const focus = Number(ncState?.focus ?? 0.5);
  const energy = Number(ncState?.energy ?? 1.0);
  const focusCode = STATE_TO_FOCUS_CODE[ncState?.currentState] ?? 12;
  const derivedResonance = Number(Math.min(1, (awareness * 0.4 + focus * 0.35 + energy * 0.25)).toFixed(4));

  const nextState = {
    ...ubo.state,
    focus_state: focusCode,
    resonance: derivedResonance,
  };
  ubo.state = nextState;
  ubo.writeToBuffer(nextState);
  for (const fn of ubo.listeners) {
    fn(ubo.state, ubo.buffer);
  }
  return { state: ubo.state, buffer: ubo.buffer };
}
