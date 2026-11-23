// es8_telemetry_harness.js - 8 ES components wired to ArohaTelemetryUBO + NeuralConsciousness bridge
import { ArohaTelemetryUBO, STREAM_URL } from "./ArohaTelemetryUBO.js";
import { wireEsComponents } from "./wireEsComponents.js";
import { syncNeuralConsciousnessToUBO } from "./consciousnessUboBridge.js";

export function createEightEsComponents() {
  const names = [
    "ES01_PortalGateStatus",
    "ES02_ResonanceGauge",
    "ES03_UboHarmonicReadout",
    "ES04_Vertebrae33Spine",
    "ES05_ChladniPlateSurface",
    "ES06_HarmonicLockIndicator",
    "ES07_FocusStateMeter",
    "ES08_Std140BufferMirror",
  ];

  return names.map((name, idx) => ({
    id: idx + 1,
    name,
    updates: 0,
    lastState: null,
    lastBufferLen: 0,
    onTelemetryFrame(state, buffer) {
      this.updates += 1;
      this.lastState = state;
      this.lastBufferLen = buffer.byteLength;
    },
  }));
}

export function mountEightComponentHarness(url = STREAM_URL) {
  const ubo = new ArohaTelemetryUBO(url);
  const components = createEightEsComponents();
  const teardown = wireEsComponents(components, ubo);
  const pushNeuralConsciousness = (ncState) => syncNeuralConsciousnessToUBO(ncState, ubo);
  window.__AROHA_HARNESS__ = { ubo, components, teardown, pushNeuralConsciousness };
  return { ubo, components, teardown, pushNeuralConsciousness };
}
