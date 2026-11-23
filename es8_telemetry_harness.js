// es8_telemetry_harness.js - 8 ES components wired to ArohaTelemetryUBO + NeuralConsciousness bridge + WebGL2 UBO
import { ArohaTelemetryUBO, STREAM_URL } from "./ArohaTelemetryUBO.js";
import { wireEsComponents } from "./wireEsComponents.js";
import { syncNeuralConsciousnessToUBO } from "./consciousnessUboBridge.js";

export function createWebGL2UboUploader(canvas) {
  const gl = canvas?.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) return { supported: false, byteLength: 0, dispose() {} };
  const uboBuffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, uboBuffer);
  gl.bufferData(gl.UNIFORM_BUFFER, 48, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uboBuffer);
  return {
    supported: true,
    byteLength: 48,
    upload(float32Buffer) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, uboBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, float32Buffer);
      return gl.getBufferParameter(gl.UNIFORM_BUFFER, gl.BUFFER_SIZE);
    },
    dispose() {
      gl.deleteBuffer(uboBuffer);
    },
  };
}

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

export function mountEightComponentHarness(url = STREAM_URL, canvas = null) {
  const ubo = new ArohaTelemetryUBO(url);
  const components = createEightEsComponents();
  const gpuUbo = createWebGL2UboUploader(canvas);
  const gpuListener = (_state, buffer) => {
    if (gpuUbo.supported) gpuUbo.upload(buffer);
  };
  ubo.listeners.add(gpuListener);
  const baseTeardown = wireEsComponents(components, ubo);
  const teardown = () => {
    ubo.listeners.delete(gpuListener);
    baseTeardown();
    gpuUbo.dispose();
  };
  const pushNeuralConsciousness = (ncState) => syncNeuralConsciousnessToUBO(ncState, ubo);
  window.__AROHA_HARNESS__ = { ubo, components, gpuUbo, teardown, pushNeuralConsciousness };
  return { ubo, components, gpuUbo, teardown, pushNeuralConsciousness };
}
