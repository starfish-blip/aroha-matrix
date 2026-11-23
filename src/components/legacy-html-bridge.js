import { UBO_SLOTS, sharedArohaUBO } from "./aroha-telemetry-ubo.js";

/**
 * Bridges legacy HTML modules (e.g. Maramataka / star-chart / resonator views)
 * into ArohaTelemetryUBO via `window.arohaLegacyBridge` and DOM/CustomEvent hooks.
 */
export function createLegacyHtmlBridge(ubo = sharedArohaUBO) {
  const api = {
    id: "legacy-html-bridge",
    setLunarPhase(phase01, source = "legacy-html-bridge") {
      const clamped = Math.max(0, Math.min(1, Number(phase01)));
      ubo.setSlot(UBO_SLOTS.LUNAR_PHASE, clamped, source);
      return clamped;
    },
    setStarChartParams({ raHours = 0, decDeg = 0, carrierHz, chladniN, chladniM }, source = "legacy-html-bridge") {
      // Map celestial coordinates deterministically into normalized lunar/phase & Chladni/frequency slots
      const normPhase = (((Number(raHours) % 24) + 24) % 24) / 24;
      const updates = { lunarPhase: normPhase };
      if (carrierHz !== undefined) updates.carrierHz = Number(carrierHz);
      if (chladniN !== undefined) updates.chladniN = Number(chladniN);
      if (chladniM !== undefined) updates.chladniM = Number(chladniM);
      if (decDeg !== undefined && chladniM === undefined) {
        updates.chladniM = Math.max(1, Math.min(12, Math.round(Math.abs(Number(decDeg)) / 15) || 1));
      }
      ubo.patch(updates, source);
      return ubo.snapshot();
    },
    onUBOUpdate(state, _f32, detail) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aroha:ubo:sync", { detail: { state, detail } }));
      }
    }
  };

  if (typeof window !== "undefined") {
    window.arohaLegacyBridge = api;
    window.addEventListener("aroha:legacy:patch", (evt) => {
      const payload = evt?.detail || {};
      if (payload.starChart) {
        api.setStarChartParams(payload.starChart, payload.source || "dom-legacy");
      } else {
        ubo.patch(payload, payload.source || "dom-legacy");
      }
    });
  }

  return api;
}

export function bindUBO(ubo = sharedArohaUBO) {
  return createLegacyHtmlBridge(ubo);
}

export default createLegacyHtmlBridge;