import { test, expect } from '@playwright/test';

const EXPRESS_BASE = 'http://127.0.0.1:3013';
const MARIMO_BASE = 'http://127.0.0.1:8085';

test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  },
});

test.describe.serial('AROHA 33-Vertebrae Portal E2E Pipeline (Phase 1 + Phase 2 Morse)', () => {
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

  test('1. POST /api/v1/portal/unlock gates phase2_hint behind verified token aroha-33-verified', async ({ request }) => {
    // Dissonance check: non-33 vertebrae must remain locked and omit phase2_hint
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
      phase2_hint: null,
    });

    // Valid 33-vertebrae unlock check: issues aroha-33-verified + P2-F12 Morse clue
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
    expect(unlockJson.phase2_hint).toEqual({
      unlocked: true,
      cipher_id: 'P2-F12',
      plaintext: 'ZENITH 26 SPINE 33',
      next_chladni: [5, 7],
      harmonic_multiplier: 3,
      wpm: 14,
    });

    // Verify GET /api/v1/portal/state through Express :3013 persists token + phase2_hint
    const stateRes = await request.get(`${EXPRESS_BASE}/api/v1/portal/state`);
    expect(stateRes.ok()).toBeTruthy();
    const stateJson = await stateRes.json();
    expect(stateJson.status).toBe('unlocked');
    expect(stateJson.token).toBe('aroha-33-verified');
    expect(stateJson.phase2_hint).toMatchObject({
      unlocked: true,
      cipher_id: 'P2-F12',
      plaintext: 'ZENITH 26 SPINE 33',
    });
    expect(stateJson.solvers.length).toBeGreaterThan(0);
  });

  test('2. PortalBinauralEngine enforces aroha-33-verified token gate and encodes Phase 2 Morse', async ({ page }) => {
    await page.goto(`${EXPRESS_BASE}/portal-audio.html`, { waitUntil: 'domcontentloaded' });

    const clientCheck = await page.evaluate(async () => {
      const { PortalBinauralEngine, encodeMorse } = await import('/js/portal_binaural.js');
      const engine = new PortalBinauralEngine('/api/v1/portal/state');

      // 1. Forged/unverified token must be rejected by playMorseHint()
      engine.lastState = {
        status: 'unlocked',
        token: 'forged-token-00',
        resonance: { carrier_hz: 136.1, binaural_offset_hz: 4.0, focus_state: 12 },
      };

      let rejectedMsg = null;
      try {
        engine.playMorseHint('ZENITH 26 SPINE 33');
      } catch (err) {
        rejectedMsg = err.message;
      }

      // 2. Live fetch from :3013 must hydrate aroha-33-verified + P2-F12 hint
      const live = await engine.fetchPortalState();
      const tuning = engine.computeChannels(live.resonance);
      const encoded = encodeMorse(live.phase2_hint.plaintext);

      return {
        rejectedMsg,
        liveToken: live.token,
        cipherId: live.phase2_hint?.cipher_id,
        morseHz: tuning.morseHz,
        encoded,
      };
    });

    expect(clientCheck.rejectedMsg).toContain('aroha-33-verified');
    expect(clientCheck.liveToken).toBe('aroha-33-verified');
    expect(clientCheck.cipherId).toBe('P2-F12');
    expect(clientCheck.morseHz).toBeCloseTo(408.3, 1);
    expect(clientCheck.encoded).toBe('--.. . -. .. - .... / ..--- -.... / ... .--. .. -. . / ...-- ...--');
  });

  test('3. WebSocket /ws on :3013 broadcasts Focus-state telemetry and updated Phase 2 Morse clue', async ({ page }) => {
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

      await new Promise((r) => setTimeout(r, 150));

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
    expect(broadcastResult.token).toBe('aroha-33-verified');
    expect(broadcastResult.source).toBe('playwright-s24-sim');
    expect(broadcastResult.resonance).toMatchObject({
      chladni_mode: [6, 8],
      focus_state: 21,
      carrier_hz: 136.1,
      binaural_offset_hz: 1.5,
    });
    expect(broadcastResult.phase2_hint).toEqual({
      unlocked: true,
      cipher_id: 'P2-F21',
      plaintext: 'AROHA OMEGA 136',
      next_chladni: [4, 9],
      harmonic_multiplier: 3,
      wpm: 14,
    });
  });

  test('4. WebGL2 ArohaHarmonicBlock std140 UBO updates live across Focus transitions', async ({ page, request }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

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

    await expect
      .poll(async () => page.evaluate(() => window.__arohaUboWrites), { timeout: 4000 })
      .toBeGreaterThan(2);

    const initialUbo = await page.evaluate(() => window.__lastArohaUbo);
    expect(initialUbo).toHaveLength(16);
    expect(initialUbo[0]).toBe(6);
    expect(initialUbo[1]).toBe(8);
    expect(initialUbo[2]).toBeCloseTo(136.1, 2);
    expect(initialUbo[3]).toBeCloseTo(1.5, 2);
    expect(initialUbo[7]).toBe(1);
    expect(initialUbo[8]).toBe(21);

    // Push Focus 15 (2.5 Hz Delta) and verify UBO + P2-F15 hint propagate over /ws
    const postRes = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 15,
      },
    });
    expect(postRes.ok()).toBeTruthy();
    const postJson = await postRes.json();
    expect(postJson.phase2_hint.cipher_id).toBe('P2-F15');

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

    const phaseA = await page.evaluate(() => window.__lastArohaUbo[6]);
    await page.waitForTimeout(120);
    const phaseB = await page.evaluate(() => window.__lastArohaUbo[6]);
    expect(phaseA).not.toBe(phaseB);
    expect(pageErrors).toEqual([]);
  });

  test('5. Marimo sandbox on :8085 serves clean HTTP 200 and mounts reactive UI', async ({ page, request }) => {
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