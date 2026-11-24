import { test, expect } from '@playwright/test';

test.describe('AROHA Matrix: 48-Byte std140 Maramataka + Web Audio FFT UBO Suite', () => {

  test('T4-01A: Proxied /api/maramataka REST endpoint returns valid synodic & thermal resonator state', async ({ request }) => {
    // Reset backend state to 36.6C baseline so open browser tabs or prior runs do not skew T4-01A
    const resetRes = await request.post('http://127.0.0.1:3013/api/telemetry/reset');
    expect(resetRes.ok()).toBeTruthy();

    const res = await request.get('http://127.0.0.1:3013/api/maramataka');
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.maramataka_phase).toBeTruthy();
    expect(data.lunar_day).toBeGreaterThanOrEqual(1);
    expect(data.lunar_day).toBeLessThanOrEqual(30);
    expect(data.thermal_temp).toBeCloseTo(36.6, 1);
    expect(data.thermal_freq).toBeCloseTo(261.63, 1);
  });

  test('T4-01B: WebGL2 TelemetryBlock UBO allocates 48 bytes (12 floats) and streams live Web Audio FFT bands', async ({ page }) => {
    await page.goto('http://127.0.0.1:3013');

    // Fail fast if port 3013 serves the wrong page instead of the WebGL2 visualizer
    await expect(page.locator('#aroha-canvas')).toBeVisible({ timeout: 5000 });

    await page.waitForFunction(() => {
      return Boolean(
        window.__AROHA_DEBUG__?.telemetry?.isConnected &&
        window.__AROHA_DEBUG__.readGPUUBO().floats[2] > 0
      );
    }, undefined, { timeout: 10000 });

    await page.locator('#btn-audio').click();

    await page.waitForFunction(() => {
      const f = window.__AROHA_DEBUG__.readGPUUBO().floats;
      return f[8] > 0.01 && f[9] > 0.01 && f[11] > 0.01;
    }, undefined, { timeout: 10000 });

    const uboDump = await page.evaluate(() => window.__AROHA_DEBUG__.readGPUUBO());
    expect(uboDump.byteLength).toBe(48);
    expect(uboDump.blockIndex).not.toBe(-1);
    expect(uboDump.bindingPoint).toBe(0);

    const [
      u_thermal_temp,
      u_chladni_freq,
      u_time,
      u_binaural_delta,
      u_lunar_illumination,
      u_lunar_energy,
      u_thermal_freq,
      u_lunar_day,
      u_fft_sub,
      u_fft_mid,
      u_fft_high,
      u_wai_flux
    ] = uboDump.floats;

    expect(u_thermal_temp).toBeGreaterThan(30.0);
    expect(u_chladni_freq).toBeGreaterThan(100.0);
    expect(u_time).toBeGreaterThan(0.0);
    expect(u_binaural_delta).toBeGreaterThan(0.5);
    expect(u_lunar_illumination).toBeGreaterThanOrEqual(0.0);
    expect(u_lunar_energy).toBeGreaterThan(0.0);
    expect(u_thermal_freq).toBeGreaterThan(200.0);
    expect(u_lunar_day).toBeGreaterThanOrEqual(1);
    expect(u_fft_sub).toBeGreaterThan(0.0);
    expect(u_fft_mid).toBeGreaterThan(0.0);
    expect(u_fft_high).toBeGreaterThanOrEqual(0.0);
    expect(u_wai_flux).toBeGreaterThan(0.0);
  });

  test('T4-01C: Deterministic FFT band injection & Rakaunui Night 16 sync accurately to GPU UBO offsets 32..44', async ({ page }) => {
    await page.goto('http://127.0.0.1:3013');
    await expect(page.locator('#aroha-canvas')).toBeVisible({ timeout: 5000 });
    await page.waitForFunction(() => Boolean(window.__AROHA_DEBUG__?.telemetry?.isConnected), undefined, { timeout: 10000 });

    await page.evaluate(() => {
      window.__AROHA_DEBUG__.setFFTOverride(0.85, 0.65, 0.45);
      window.__AROHA_DEBUG__.telemetry.send({
        auto_lunar: true,
        override_lunar_day: 16,
        thermal_temp: 48.6
      });
    });

    await page.waitForFunction(() => {
      const f = window.__AROHA_DEBUG__.readGPUUBO().floats;
      return Math.round(f[7]) === 16 && Math.abs(f[8] - 0.85) < 0.01 && Math.abs(f[6] - 523.26) < 0.5;
    }, undefined, { timeout: 10000 });

    const uboDump = await page.evaluate(() => window.__AROHA_DEBUG__.readGPUUBO());
    const f = uboDump.floats;

    expect(f[6]).toBeCloseTo(523.26, 1); // u_thermal_freq at +12C octave
    expect(f[7]).toBe(16);               // u_lunar_day (Rakaunui)
    expect(f[8]).toBeCloseTo(0.85, 2);   // u_fft_sub (offset 32)
    expect(f[9]).toBeCloseTo(0.65, 2);   // u_fft_mid (offset 36)
    expect(f[10]).toBeCloseTo(0.45, 2);  // u_fft_high (offset 40)
    expect(f[11]).toBeCloseTo(1.05, 2);  // u_wai_flux (offset 44)

    await page.evaluate(() => {
      window.__AROHA_DEBUG__.setFFTOverride(null);
      window.__AROHA_DEBUG__.telemetry.send({
        auto_lunar: true,
        override_lunar_day: 0,
        thermal_temp: 36.6
      });
    });
  });
});