import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createAlchemistSigilModulator(ubo = sharedArohaUBO) {
  return {
    id: "alchemist-sigil-modulator",
    charge: ubo.f32[UBO_SLOTS.SIGIL_CHARGE],
    lunarPhase: ubo.f32[UBO_SLOTS.LUNAR_PHASE],
    setSigilCharge(value, source = "alchemist-sigil-modulator") {
      const clamped = Math.max(0, Math.min(1, Number(value)));
      ubo.setSlot(UBO_SLOTS.SIGIL_CHARGE, clamped, source);
      return clamped;
    },
    onUBOUpdate(state) {
      this.charge = state.sigilCharge;
      this.lunarPhase = state.lunarPhase;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createAlchemistSigilModulator(ubo);
}

export default createAlchemistSigilModulator;