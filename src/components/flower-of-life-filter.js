import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createFlowerOfLifeFilter(ubo = sharedArohaUBO) {
  return {
    id: "flower-of-life-filter",
    cutoffHz: ubo.f32[UBO_SLOTS.FILTER_CUTOFF],
    resonanceQ: ubo.f32[UBO_SLOTS.RESONANCE_Q],
    setFilter(cutoffHz, resonanceQ = null, source = "flower-of-life-filter") {
      const patch = { filterCutoffHz: Number(cutoffHz) };
      if (resonanceQ !== null) patch.resonanceQ = Number(resonanceQ);
      ubo.patch(patch, source);
      return { cutoffHz: ubo.f32[UBO_SLOTS.FILTER_CUTOFF], resonanceQ: ubo.f32[UBO_SLOTS.RESONANCE_Q] };
    },
    onUBOUpdate(state) {
      this.cutoffHz = state.filterCutoffHz;
      this.resonanceQ = state.resonanceQ;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createFlowerOfLifeFilter(ubo);
}

export default createFlowerOfLifeFilter;