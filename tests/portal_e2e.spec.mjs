import { test, expect } from '@playwright/test';

const EXPRESS_BASE = 'http://127.0.0.1:3013';
const MARIMO_BASE = 'http://127.0.0.1:8085';

test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  },
});

test.describe.serial('AROHA 33-Vertebrae Portal E2E Pipeline (Phase 1 + Phase 2 Zenith + Phase 3 Crown)', () => {
  test.afterAll(async ({ request }) => {
    await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 12,
        reset_sequence: true,
      },
    });
  });

  test('1. POST /api/v1/portal/unlock gates Phase 1 & completes 4-step Phase 2 Zenith sequence', async ({ request }) => {
    const lockedRes = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
      data: {
        vertebrae_count: 32,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        focus_state: 12,
      },
    });
    expect(lockedRes.ok()).toBeTruthy();
    expect(await lockedRes.json()).toEqual({
      status: 'locked',
      signal: 'dissonance_detected',
      phase2_token: null,
      phase3_token: null,
      phase2_hint: null,
    });

    const seq = [
      { mode: [5, 7], reset: true, expectedStep: 1, expectedStatus: 'in_progress', expectedNext: [6, 8] },
      { mode: [6, 8], reset: false, expectedStep: 2, expectedStatus: 'in_progress', expectedNext: [7, 9] },
      { mode: [7, 9], reset: false, expectedStep: 3, expectedStatus: 'in_progress', expectedNext: [4, 9] },
      { mode: [4, 9], reset: false, expectedStep: 4, expectedStatus: 'zenith_unlocked', expectedNext: null },
    ];

    let lastResp = null;
    for (const s of seq) {
      const res = await request.post(`${EXPRESS_BASE}/api/v1/portal/unlock`, {
        data: {
          vertebrae_count: 33,
          chladni_mode: s.mode,
          harmonic_lock: true,
          focus_state: 12,
          reset_sequence: s.reset,
        },
      });
      expect(res.ok()).toBeTruthy();
      lastResp = await res.json();
      expect(lastResp.token).toBe('aroha-33-verified');
      expect(lastResp.phase2_progression.step_index).toBe(s.expectedStep);
      expect(lastResp.phase2_progression.phase2_status).toBe(s.expectedStatus);
      expect(lastResp.phase2_progression.next_expected_mode).toEqual(s.expectedNext);
    }

    expect(lastResp.phase2_token).toBe('aroha-zenith-26-master');
    expect(lastResp.phase2_hint).toMatchObject({
      unlocked: true,
      cipher_id: 'P2-ZENITH',
      plaintext: 'ZENITH 26 CROWN UNLOCKED',
    });
  });

  test('2. Phase 3 Crown Reward API & Synth Preset require valid aroha-zenith-26-master token', async ({ request }) => {
    // Reject forged token
    const badCrown = await request.post(`${EXPRESS_BASE}/api/v1/portal/phase3/crown`, {
      data: { phase2_token: 'invalid-token' },
    });
    expect(badCrown.status()).toBe(403);

    // Manifest Phase 3 Crown Reward using active aroha-zenith-26-master
    const okCrown = await request.post(`${EXPRESS_BASE}/api/v1/portal/phase3/crown`, {
      data: { phase2_token: 'aroha-zenith-26-master' },
    });
    expect(okCrown.ok()).toBeTruthy();
    const crownJson = await okCrown.json();
    expect(crownJson.phase3_token).toBe('aroha-crown-33-starmap');
    expect(crownJson.phase3_crown.star_map_coordinates).toMatchObject({
      sector: 'CRUX-CENTAURUS-ZENITH-26',
      ra_hours: 13.33,
      dec_deg: -41.21,
    });
    expect(crownJson.phase3_crown.synth_preset.fundamental_carrier_hz).toBeCloseTo(136.1, 1);

    // Verify downloadable synth preset endpoint
    const presetRes = await request.get(
      `${EXPRESS_BASE}/api/v1/portal/phase3/preset.json?token=aroha-zenith-26-master`
    );
    expect(presetRes.ok()).toBeTruthy();
    expect(presetRes.headers()['content-disposition']).toContain('aroha-zenith-26-synth-preset.json');
    const presetBody = await presetRes.json();
    expect(presetBody.phase3_token).toBe('aroha-crown-33-starmap');
  });

  test('3. PortalBinauralEngine enforces aroha-33-verified gate and encodes Morse', async ({ page }) => {
    await page.goto(`${EXPRESS_BASE}/portal-audio.html`, { waitUntil: 'domcontentloaded' });

    const clientCheck = await page.evaluate(async () => {
      const { PortalBinauralEngine, encodeMorse } = await import('/js/portal_binaural.js');
      const engine = new PortalBinauralEngine('/api/v1/portal/state');

      engine.lastState = {
        status: 'unlocked',
        token: 'forged-token-00',
        resonance: { carrier_hz: 136.1, binaural_offset_hz: 4.0, focus_state: 12 },
      };

      let rejectedMsg = null;
      try {
        engine.playMorseHint('ZENITH 26 CROWN UNLOCKED');
      } catch (err) {
        rejectedMsg = err.message;
      }

      const live = await engine.fetchPortalState();
      const tuning = engine.computeChannels(live.resonance);
      const encoded = encodeMorse(live.phase2_hint.plaintext);

      return {
        rejectedMsg,
        liveToken: live.token,
        phase2Token: live.phase2_token,
        phase3Token: live.phase3_token,
        morseHz: tuning.morseHz,
        encoded,
      };
    });

    expect(clientCheck.rejectedMsg).toContain('aroha-33-verified');
    expect(clientCheck.liveToken).toBe('aroha-33-verified');
    expect(clientCheck.phase2Token).toBe('aroha-zenith-26-master');
    expect(clientCheck.phase3Token).toBe('aroha-crown-33-starmap');
    expect(clientCheck.morseHz).toBeCloseTo(408.3, 1);
    expect(clientCheck.encoded).toContain('--.. . -. .. - ....');
  });

  test('4. WebSocket /ws on :3013 broadcasts Focus-state telemetry to connected clients', async ({ page }) => {
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
          chladni_mode: [4, 9],
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
      chladni_mode: [4, 9],
      focus_state: 21,
      carrier_hz: 136.1,
      binaural_offset_hz: 1.5,
    });
  });

  test('5. 3-Zone Workspace (/workspace.html) renders WebGL2 UBO + Phase 3 Crown HUD', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      window.__arohaUboWrites = 0;
      const origBufferSubData = WebGL2RenderingContext.prototype.bufferSubData;
      WebGL2RenderingContext.prototype.bufferSubData = function (target, dstByteOffset, srcData, ...rest) {
        if (target === this.UNIFORM_BUFFER && srcData && srcData.byteLength === 64) {
          window.__arohaUboWrites += 1;
        }
        return origBufferSubData.call(this, target, dstByteOffset, srcData, ...rest);
      };
    });

    await page.goto(`${EXPRESS_BASE}/workspace.html`, { waitUntil: 'networkidle' });

    const hud = page.locator('aroha-portal-hud');
    await expect(hud).toBeAttached({ timeout: 5000 });
    await expect(hud.locator('#zenithBox')).toContainText('aroha-zenith-26-master', { timeout: 5000 });
    await expect(hud.locator('#crownBox')).toContainText('aroha-crown-33-starmap', { timeout: 5000 });
    await expect(hud.locator('#crownBox')).toContainText('RA 13.33h', { timeout: 5000 });

    await expect
      .poll(async () => page.evaluate(() => window.__arohaUboWrites), { timeout: 4000 })
      .toBeGreaterThan(2);

    expect(pageErrors).toEqual([]);
  });

  test('6. Marimo sandbox on :8085 serves clean HTTP 200 and mounts reactive UI', async ({ page, request }) => {
    const httpRes = await request.get(`${MARIMO_BASE}/`);
    expect(httpRes.status()).toBe(200);
    const html = await httpRes.text();
    expect(html.toLowerCase()).toContain('marimo');

    const runtimeErrors = [];
    page.on('pageerror', (err) => runtimeErrors.push(err.message));

    await page.goto(`${MARIMO_BASE}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).toBeAttached({ timeout: 5000 });
    await expect(page.locator('body')).toContainText('AROHA 33-Vertebrae', { timeout: 8000 });
    expect(runtimeErrors).toEqual([]);
  });
});