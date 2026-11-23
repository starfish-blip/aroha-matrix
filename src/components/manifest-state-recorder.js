import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

export function createManifestStateRecorder(ubo = sharedArohaUBO) {
  return {
    id: "manifest-state-recorder",
    records: [],
    record(label = "snapshot", source = "manifest-state-recorder") {
      const entry = {
        label,
        source,
        ts: Date.now(),
        sigilCharge: ubo.f32[UBO_SLOTS.SIGIL_CHARGE],
        thermalTempC: ubo.f32[UBO_SLOTS.THERMAL_TEMP_C],
        carrierHz: ubo.f32[UBO_SLOTS.CARRIER_HZ]
      };
      this.records.push(entry);
      return entry;
    },
    onUBOUpdate(state, _f32, detail) {
      this.records.push({
        label: "ubo-event",
        source: detail?.source || "ubo",
        ts: detail?.ts || Date.now(),
        sigilCharge: state.sigilCharge,
        thermalTempC: state.thermalTempC,
        carrierHz: state.carrierHz
      });
    }
  };
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createManifestStateRecorder(ubo);
}

export default createManifestStateRecorder;