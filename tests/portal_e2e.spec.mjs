import { test, expect } from '@playwright/test';

const EXPRESS_BASE = 'http://127.0.0.1:3013';
const MARIMO_BASE = 'http://127.0.0.1:8085';

test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  },
});

test.describe.serial('AROHA 33-Vertebrae Portal E2E Pipeline', () => {
  test.afterAll(async ({ request }) => {
    // Restore canonical Focus 12 baseline after E2E mutations
    await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 12,
      },
    });
  });

  test('1. POST /api/v1/portal/unlock on :3013 enforces 33-vertebrae lock and persists state', async ({ request }) => {
    // Dissonance check: non-33 vertebrae must remain locked
    const lockedRes = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 32,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 12,
      },
    });
    expect(lockedRes.ok()).toBeTruthy();
    const lockedJson = await lockedRes.json();
    expect(lockedJson).toEqual({
      status: 'locked',
      signal: 'dissonance_detected',
    });

    // Valid 33-vertebrae unlock check
    const unlockRes = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 12,
      },
    });
    expect(unlockRes.ok()).toBeTruthy();
    const unlockJson = await unlockRes.json();
    expect(unlockJson.status).toBe('unlocked');
    expect(unlockJson.gateway).toBe('zenith_26');
    expect(unlockJson.token).toBe('aroha-33-verified');
    expect(unlockJson.resonance).toMatchObject({
      vertebrae_count: 33,
      chladni_mode: [5, 7],
      harmonic_lock: true,
      focus_state: 12,
      carrier_hz: 136.1,
      binaural_offset_hz: 4.0,
    });

    // Verify GET /api/v1/portal/state through Express :3013 reflects persisted disk state
    const stateRes = await request.get(`${EXPRESS_BASE}/api/v1/portal/state`);
    expect(stateRes.ok()).toBeTruthy();
    const stateJson = await stateRes.json();
    expect(stateJson.status).toBe('unlocked');
    expect(stateJson.token).toBe('aroha-33-verified');
    expect(stateJson.resonance.focus_state).toBe(12);
    expect(stateJson.solvers.length).toBeGreaterThan(0);
  });

  test('2. WebSocket /ws on :3013 broadcasts Focus-state telemetry to connected clients', async ({ page }) => {
    await page.goto(`${EXPRESS_BASE}/portal-visualizer.html`, { waitUntil: 'domcontentloaded' });

    const broadcastResult = await page.evaluate(async () => {
      const wsUrl = `ws://${window.location.host}/ws`;

      const openSocket = () =>
        new Promise((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          const messages = [];
          ws.onmessage = (ev) => messages.push(JSON.parse(ev.data));
          ws.onopen = () => resolve({ ws, messages });
          ws.onerror = () => reject(new Error(`Failed to open ${wsUrl}`));
        });

      const subscriber = await openSocket();
      const sender = await openSocket();

      // Wait for initial sync frames
      await new Promise((r) => setTimeout(r, 150));

      // Simulate S24 Ultra Tailscale telemetry step to Focus 21 / Chladni [6, 8]
      sender.ws.send(
        JSON.stringify({
          vertebrae_count: 33,
          chladni_mode: [6, 8],
          harmonic_lock: true,
          focus_state: 21,
          source: 'playwright-s24-sim',
        })
      );

      const deadline = Date.now() + 3000;
      let received = null;
      while (Date.now() < deadline) {
        received = subscriber.messages.find(
          (m) => m.type === 'portal_state' && m.resonance?.focus_state === 21
        );
        if (received) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      subscriber.ws.close();
      sender.ws.close();
      return received;
    });

    expect(broadcastResult).not.toBeNull();
    expect(broadcastResult.status).toBe('unlocked');
    expect(broadcastResult.source).toBe('playwright-s24-sim');
    expect(broadcastResult.resonance).toMatchObject({
      chladni_mode: [6, 8],
      focus_state: 21,
      carrier_hz: 136.1,
      binaural_offset_hz: 1.5,
    });
  });

  test('3. WebGL2 ArohaHarmonicBlock std140 UBO updates live across Focus transitions', async ({ page, request }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Intercept 64-byte std140 UBO writes at the WebGL2 context boundary
    await page.addInitScript(() => {
      window.__arohaUboWrites = 0;
      window.__lastArohaUbo = null;

      const origBufferSubData = WebGL2RenderingContext.prototype.bufferSubData;
      WebGL2RenderingContext.prototype.bufferSubData = function (target, dstByteOffset, srcData, ...rest) {
        if (
          target === this.UNIFORM_BUFFER &&
          srcData &&
          srcData.byteLength === 64 &&
          ArrayBuffer.isView(srcData)
        ) {
          const view = new Float32Array(srcData.buffer, srcData.byteOffset, 16);
          window.__lastArohaUbo = Array.from(view);
          window.__arohaUboWrites += 1;
        }
        return origBufferSubData.call(this, target, dstByteOffset, srcData, ...rest);
      };
    });

    await page.goto(`${EXPRESS_BASE}/portal-visualizer.html`, { waitUntil: 'networkidle' });

    // Confirm WebGL2 render loop is actively uploading the 64-byte UBO (currently Focus 21 from Test 2)
    await expect
      .poll(async () => page.evaluate(() => window.__arohaUboWrites), { timeout: 4000 })
      .toBeGreaterThan(2);

    const initialUbo = await page.evaluate(() => window.__lastArohaUbo);
    expect(initialUbo).toHaveLength(16);
    expect(initialUbo[0]).toBe(6); // chladni_m
    expect(initialUbo[1]).toBe(8); // chladni_n
    expect(initialUbo[2]).toBeCloseTo(136.1, 2); // carrier_hz
    expect(initialUbo[3]).toBeCloseTo(1.5, 2); // Focus 21 binaural_offset_hz
    expect(initialUbo[7]).toBe(1); // unlocked flag
    expect(initialUbo[8]).toBe(21); // focus_state

    // Push Focus 15 (2.5 Hz Delta) with Chladni [5, 7] and verify UBO updates via /ws -> GPU
    const postRes = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 15,
      },
    });
    expect(postRes.ok()).toBeTruthy();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const u = window.__lastArohaUbo;
            return u ? { m: u[0], n: u[1], offset: u[3], focus: u[8] } : null;
          }),
        { timeout: 4000 }
      )
      .toEqual({ m: 5, n: 7, offset: 2.5, focus: 15 });

    // Verify beat_phase (index 6) advances across animation frames
    const phaseA = await page.evaluate(() => window.__lastArohaUbo[6]);
    await page.waitForTimeout(120);
    const phaseB = await page.evaluate(() => window.__lastArohaUbo[6]);
    expect(phaseA).not.toBe(phaseB);
    expect(pageErrors).toEqual([]);
  });

  test('4. Marimo sandbox on :8085 serves clean HTTP 200 and mounts reactive UI', async ({ page, request }) => {
    const httpRes = await request.get(`${MARIMO_BASE}/`);
    expect(httpRes.status()).toBe(200);
    const html = await httpRes.text();
    expect(html.toLowerCase()).toContain('marimo');

    const runtimeErrors = [];
    page.on('pageerror', (err) => runtimeErrors.push(err.message));

    await page.goto(`${MARIMO_BASE}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root, marimo-island, body')).toBeVisible({ timeout: 5000 });
    expect(runtimeErrors).toEqual([]);
  });
});