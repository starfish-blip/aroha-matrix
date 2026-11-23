// wireEsComponents.js - Subscribes ES components to ArohaTelemetryUBO and manages SSE lifecycle
export function wireEsComponents(components, ubo) {
  const unsubscribers = components.map((comp) =>
    ubo.subscribe((state, buffer) => {
      if (typeof comp.onTelemetryFrame === "function") {
        comp.onTelemetryFrame(state, buffer);
      }
    })
  );

  ubo.connect();

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
    ubo.disconnect();
  };
}
