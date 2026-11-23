
// === AROHA MIDI -> CHLADNI BRIDGE (auto-added) ===
if (!window.__AROHA_CHLADNI_BRIDGE__) {
  window.__AROHA_CHLADNI_BRIDGE__ = true;
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('aroha-telemetry') : null;
  const applyMidi = (m) => {
    window.__AROHA_LAST_MIDI__ = m;
    try {
      const targets = [window.__AROHA_CHLADNI__, window.chladni, window.chladniVisualizer].filter(Boolean);
      for (const tg of targets) {
        if ('chladniMode' in tg) tg.chladniMode = 3 + (m.midi % 5);
        if ('excitation' in tg) tg.excitation = m.kind === 'on' ? m.velocity : 0;
        if ('mode' in tg) tg.mode = 3 + (m.midi % 5);
      }
    } catch (e) {}
  };
  if (bc) bc.onmessage = (e) => { if (e.data && e.data.type === 'aroha-midi') applyMidi(e.data); };
  window.addEventListener('aroha-midi', (e) => applyMidi(e.detail));
}

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