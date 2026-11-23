import { sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createTelemetryUboSync(ubo = sharedArohaUBO) {
  return {
    id: "telemetry-ubo-sync",
    lastPayload: null,
    syncState(partial, source = "telemetry-ubo-sync") {
      ubo.patch(partial, source);
      return ubo.snapshot();
    },
    onUBOUpdate(_state, _f32, detail) {
      this.lastPayload = detail;
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createTelemetryUboSync(ubo);
}

export default createTelemetryUboSync;