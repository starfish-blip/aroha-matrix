import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const WORKSPACE_DIR = "C:/Users/terry/aroha-matrix";
const HARNESS_ORIGIN = "http://127.0.0.1:8000/__harness__";
const STREAM_ENDPOINT = "http://100.64.150.117:8000/api/v1/portal/telemetry/stream";

test("8 ES components receive live SSE frames and 48-byte std140 UBO buffer", async ({ page }) => {
  await page.route("**/__harness__/index.html", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><head><meta charset=\\"utf-8\\"></head><body><pre id=\\"out\\">boot</pre></body></html>",
    });
  });

  await page.route("**/__harness__/*.js", async (route) => {
    const reqUrl = new URL(route.request().url());
    const fileName = path.basename(reqUrl.pathname);
    const filePath = path.join(WORKSPACE_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: `Not found: ${fileName}` });
      return;
    }
    const body = fs.readFileSync(filePath, "utf8");
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body,
    });
  });

  await page.goto(`${HARNESS_ORIGIN}/index.html`, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async ({ harnessOrigin, streamUrl }) => {
    const { mountEightComponentHarness } = await import(`${harnessOrigin}/es8_telemetry_harness.js`);
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
  }, { harnessOrigin: HARNESS_ORIGIN, streamUrl: STREAM_ENDPOINT });

  expect(result.componentCount).toBe(8);
  expect(result.bufferByteLength).toBe(48);
  expect(result.floatsLength).toBe(12);
  expect(result.allUpdatedAtLeastOnce).toBe(true);
  expect(result.allBuffer48Bytes).toBe(true);
});
