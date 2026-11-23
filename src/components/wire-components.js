import { ArohaTelemetryUBO, UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

const COMPONENT_SPECS = [
  { id: "alchemist-sigil-modulator", file: "./alchemist-sigil-modulator.js", slots: [UBO_SLOTS.SIGIL_CHARGE, UBO_SLOTS.LUNAR_PHASE] },
  { id: "binaural-monroe-entrainment", file: "./binaural-monroe-entrainment.js", slots: [UBO_SLOTS.CARRIER_HZ, UBO_SLOTS.BEAT_DELTA_HZ] },
  { id: "chladni-nodal-visualizer", file: "./chladni-nodal-visualizer.js", slots: [UBO_SLOTS.CHLADNI_N, UBO_SLOTS.CHLADNI_M, UBO_SLOTS.CARRIER_HZ] },
  { id: "fader-bank-jupiter", file: "./fader-bank-jupiter.js", slots: [UBO_SLOTS.JUPITER_GAIN, UBO_SLOTS.CARRIER_HZ] },
  { id: "fader-bank-saturn", file: "./fader-bank-saturn.js", slots: [UBO_SLOTS.SATURN_GAIN, UBO_SLOTS.FILTER_CUTOFF] },
  { id: "flower-of-life-filter", file: "./flower-of-life-filter.js", slots: [UBO_SLOTS.FILTER_CUTOFF, UBO_SLOTS.RESONANCE_Q] },
  { id: "manifest-state-recorder", file: "./manifest-state-recorder.js", slots: [UBO_SLOTS.SIGIL_CHARGE, UBO_SLOTS.THERMAL_TEMP_C] },
  { id: "telemetry-ubo-sync", file: "./telemetry-ubo-sync.js", slots: Object.values(UBO_SLOTS) }
];

export async function wireArohaComponents(ubo = sharedArohaUBO, options = {}) {
  const wired = new Map();

  for (const spec of COMPONENT_SPECS) {
    let mod = {};
    try {
      mod = await import(spec.file);
    } catch (err) {
      mod = { stub: true, error: err.message };
    }

    const instance =
      typeof mod.bindUBO === "function" ? mod.bindUBO(ubo, options) :
      typeof mod.default === "function" ? new mod.default({ ubo, ...options }) :
      mod;

    const listener = (evt) => {
      if (instance && typeof instance.onUBOUpdate === "function") {
        instance.onUBOUpdate(evt.detail.state, ubo.f32, evt.detail);
      } else if (typeof mod.updateFromUBO === "function") {
        mod.updateFromUBO(evt.detail.state, ubo.f32, evt.detail);
      }
    };

    ubo.addEventListener("ubo:update", listener);
    wired.set(spec.id, { spec, mod, instance, listener });
  }

  if (options.sseUrl) {
    ubo.connectSSE(options.sseUrl);
  }

  return {
    ubo,
    wired,
    tick(timeSec) {
      return ubo.commit(timeSec);
    },
    teardown() {
      for (const entry of wired.values()) {
        ubo.removeEventListener("ubo:update", entry.listener);
      }
      wired.clear();
    }
  };
}

export { ArohaTelemetryUBO, UBO_SLOTS, sharedArohaUBO, COMPONENT_SPECS };