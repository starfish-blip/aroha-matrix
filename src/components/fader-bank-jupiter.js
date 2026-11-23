import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createFaderBankJupiter(ubo = sharedArohaUBO) {
  return {
    id: "fader-bank-jupiter",
    gain: ubo.f32[UBO_SLOTS.JUPITER_GAIN],
    carrierHz: ubo.f32[UBO_SLOTS.CARRIER_HZ],
    setGain(gain, source = "fader-bank-jupiter") {
      const clamped = Math.max(0, Math.min(1, Number(gain)));
      ubo.setSlot(UBO_SLOTS.JUPITER_GAIN, clamped, source);
      return clamped;
    },
    onUBOUpdate(state) {
      this.gain = state.jupiterGain;
      this.carrierHz = state.carrierHz;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createFaderBankJupiter(ubo);
}

export default createFaderBankJupiter;