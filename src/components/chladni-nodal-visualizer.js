import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createChladniNodalVisualizer(ubo = sharedArohaUBO) {
  return {
    id: "chladni-nodal-visualizer",
    n: ubo.f32[UBO_SLOTS.CHLADNI_N],
    m: ubo.f32[UBO_SLOTS.CHLADNI_M],
    carrierHz: ubo.f32[UBO_SLOTS.CARRIER_HZ],
    setModes(n, m, source = "chladni-nodal-visualizer") {
      ubo.patch({ chladniN: Number(n), chladniM: Number(m) }, source);
      return { n: ubo.f32[UBO_SLOTS.CHLADNI_N], m: ubo.f32[UBO_SLOTS.CHLADNI_M] };
    },
    onUBOUpdate(state) {
      this.n = state.chladniN;
      this.m = state.chladniM;
      this.carrierHz = state.carrierHz;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createChladniNodalVisualizer(ubo);
}

export default createChladniNodalVisualizer;