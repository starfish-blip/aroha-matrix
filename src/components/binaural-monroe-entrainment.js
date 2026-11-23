import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createBinauralMonroeEntrainment(ubo = sharedArohaUBO) {
  return {
    id: "binaural-monroe-entrainment",
    carrierHz: ubo.f32[UBO_SLOTS.CARRIER_HZ],
    beatDeltaHz: ubo.f32[UBO_SLOTS.BEAT_DELTA_HZ],
    setEntrainment({ carrierHz, beatDeltaHz }, source = "binaural-monroe-entrainment") {
      if (carrierHz !== undefined) ubo.setSlot(UBO_SLOTS.CARRIER_HZ, Number(carrierHz), source);
      if (beatDeltaHz !== undefined) ubo.setSlot(UBO_SLOTS.BEAT_DELTA_HZ, Number(beatDeltaHz), source);
      return { carrierHz: ubo.f32[UBO_SLOTS.CARRIER_HZ], beatDeltaHz: ubo.f32[UBO_SLOTS.BEAT_DELTA_HZ] };
    },
    onUBOUpdate(state) {
      this.carrierHz = state.carrierHz;
      this.beatDeltaHz = state.beatDeltaHz;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createBinauralMonroeEntrainment(ubo);
}

export default createBinauralMonroeEntrainment;