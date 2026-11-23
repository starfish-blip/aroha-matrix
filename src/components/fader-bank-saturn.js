import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createFaderBankSaturn(ubo = sharedArohaUBO) {
  return {
    id: "fader-bank-saturn",
    gain: ubo.f32[UBO_SLOTS.SATURN_GAIN],
    filterCutoffHz: ubo.f32[UBO_SLOTS.FILTER_CUTOFF],
    setGain(gain, source = "fader-bank-saturn") {
      const clamped = Math.max(0, Math.min(1, Number(gain)));
      ubo.setSlot(UBO_SLOTS.SATURN_GAIN, clamped, source);
      return clamped;
    },
    onUBOUpdate(state) {
      this.gain = state.saturnGain;
      this.filterCutoffHz = state.filterCutoffHz;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createFaderBankSaturn(ubo);
}

export default createFaderBankSaturn;