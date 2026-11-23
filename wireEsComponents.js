// wireEsComponents.js - Attaches 8 ES components to shared ArohaTelemetryUBO stream
import { telemetryUBO } from "./ArohaTelemetryUBO.js";

export function attachComponentToUBO(component, ubo = telemetryUBO) {
  return ubo.subscribe((state, buffer) => {
    if (typeof component.onTelemetryFrame === "function") {
      component.onTelemetryFrame(state, buffer);
    }
    if (component.gl && component.uboBuffer) {
      const gl = component.gl;
      gl.bindBuffer(gl.UNIFORM_BUFFER, component.uboBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, buffer);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }
  });
}

export function wireEsComponents(components, ubo = telemetryUBO) {
  if (!Array.isArray(components) || components.length !== 8) {
    throw new Error(`Expected 8 ES components, received ${components?.length ?? 0}`);
  }
  ubo.connect();
  const unsubs = components.map((comp) => attachComponentToUBO(comp, ubo));
  return () => {
    for (const off of unsubs) off();
    ubo.disconnect();
  };
}
