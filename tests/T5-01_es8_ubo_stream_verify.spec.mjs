import { test, expect } from "@playwright/test";

const STREAM_ENDPOINT = "http://100.64.150.117:8000/api/v1/portal/telemetry/stream";

test("8 ES components receive live SSE frames and 48-byte std140 UBO buffer", async ({ page }) => {
  await page.setContent(`<!doctype html><html><body><pre id="out">boot</pre></body></html>`);

  // Serve module files from workspace via static route or import via /@fs / /app routes
  await page.route("**/ArohaTelemetryUBO.js", async (route) => {
    const fs = await import("node:fs");
    const body = fs.readFileSync("C:/Users/terry/aroha-matrix/ArohaTelemetryUBO.js", "utf8");
    await route.fulfill({ status: 200, contentType: "application/javascript", body });
  });

  await page.route("**/wireEsComponents.js", async (route) => {
    const fs = await import("node:fs");
    const body = fs.readFileSync("C:/Users/terry/aroha-matrix/wireEsComponents.js", "utf8");
    await route.fulfill({ status: 200, contentType: "application/javascript", body });
  });

  await page.route("**/es8_telemetry_harness.js", async (route) => {
    const fs = await import("node:fs");
    const body = fs.readFileSync("C:/Users/terry/aroha-matrix/es8_telemetry_harness.js", "utf8");
    await route.fulfill({ status: 200, contentType: "application/javascript", body });
  });

  const result = await page.evaluate(async (streamUrl) => {
    const { mountEightComponentHarness } = await import("http://127.0.0.1:8000/__harness__/es8_telemetry_harness.js");
    const { ubo, components, teardown } = mountEightComponentHarness(streamUrl);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const minUpdates = Math.min(...components.map((c) => c.updates));
        if (minUpdates >= 1) resolve();
        else reject(new Error("No SSE telemetry frame received within timeout"));
      }, 3500);
    });

    const summary = {
      componentCount: components.length,
      bufferByteLength: ubo.buffer.byteLength,
      floatsLength: ubo.buffer.length,
      allUpdatedAtLeastOnce: components.every((c) => c.updates >= 1),
      allBuffer48Bytes: components.every((c) => c.lastBufferLen === 48),
      updatesPerComponent: components.map((c) => ({ name: c.name, updates: c.updates })),
      latestState: ubo.state,
    };

    teardown();
    return summary;
  }, STREAM_ENDPOINT);

  expect(result.componentCount).toBe(8);
  expect(result.bufferByteLength).toBe(48);
  expect(result.floatsLength).toBe(12);
  expect(result.allUpdatedAtLeastOnce).toBe(true);
  expect(result.allBuffer48Bytes).toBe(true);
});
