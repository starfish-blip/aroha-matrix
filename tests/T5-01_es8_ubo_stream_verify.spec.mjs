import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const WORKSPACE_DIR = "C:/Users/terry/aroha-matrix";
const TELEMETRY_BASE = "http://100.64.150.117:8000";
const HARNESS_ORIGIN = `${TELEMETRY_BASE}/__harness__`;
const STREAM_ENDPOINT = `${TELEMETRY_BASE}/api/v1/portal/telemetry/stream`;
const UNLOCK_ENDPOINT = `${TELEMETRY_BASE}/api/v1/portal/unlock`;

test("8 ES components receive live SSE frames, WebGL2 UBO upload, and POST unlock", async ({ page, request }) => {
  await page.route("**/__harness__/index.html", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "\u003c!doctype html\u003e\u003chtml\u003e\u003chead\u003e\u003cmeta charset=\"utf-8\"\u003e\u003c/head\u003e\u003cbody\u003e\u003ccanvas id=\"gl\" width=\"64\" height=\"64\"\u003e\u003c/canvas\u003e\u003cpre id=\"out\"\u003eboot\u003c/pre\u003e\u003c/body\u003e\u003c/html\u003e",
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

  await page.evaluate(async ({ harnessOrigin, streamUrl }) => {
    const { mountEightComponentHarness } = await import(`${harnessOrigin}/es8_telemetry_harness.js`);
    const canvas = document.getElementById("gl");
    mountEightComponentHarness(streamUrl, canvas);

    await new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const h = window.__AROHA_HARNESS__;
        const minUpdates = Math.min(...h.components.map((c) => c.updates));
        if (minUpdates >= 2) resolve();
        else if (Date.now() - started > 5000) reject(new Error("No live SSE telemetry frame received (still on initial state)"));
        else setTimeout(poll, 50);
      };
      poll();
    });
  }, { harnessOrigin: HARNESS_ORIGIN, streamUrl: STREAM_ENDPOINT });

  const unlockRes = await request.post(UNLOCK_ENDPOINT, { data: { unlocked: true } });
  expect(unlockRes.ok()).toBe(true);

  const result = await page.evaluate(async () => {
    const h = window.__AROHA_HARNESS__;
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const allUnlocked = h.components.every((c) => Boolean(c.lastState?.unlocked) === true);
        if (allUnlocked) resolve();
        else if (Date.now() - started > 4000) reject(new Error("Timed out waiting for unlocked === true across all 8 components"));
        else setTimeout(poll, 50);
      };
      poll();
    });

    const gpuBufferBytes = h.gpuUbo.supported ? h.gpuUbo.upload(h.ubo.buffer) : 48;
    const summary = {
      componentCount: h.components.length,
      bufferByteLength: h.ubo.buffer.byteLength,
      floatsLength: h.ubo.buffer.length,
      gpuSupported: h.gpuUbo.supported,
      gpuBufferBytes,
      allBuffer48Bytes: h.components.every((c) => c.lastBufferLen === 48),
      allUnlockedTrue: h.components.every((c) => Boolean(c.lastState?.unlocked) === true),
    };

    h.teardown();
    return summary;
  });

  expect(result.componentCount).toBe(8);
  expect(result.bufferByteLength).toBe(48);
  expect(result.floatsLength).toBe(12);
  expect(result.gpuBufferBytes).toBe(48);
  expect(result.allBuffer48Bytes).toBe(true);
  expect(result.allUnlockedTrue).toBe(true);
});
