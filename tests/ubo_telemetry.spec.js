const { test, expect } = require('@playwright/test');

test.describe('AROHA Matrix std140 UBO & Telemetry Pipeline', () => {
  test('should unlock portal and transmit UBO telemetry', async ({ page }) => {
    // 1. Navigate to local Express gateway / frontend
    await page.goto('http://127.0.0.1:3013');

    // 2. Test health endpoint via fetch
    const healthCheck = await page.evaluate(async () => {
      const res = await fetch('/api/v1/portal/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertebrae_count: 33,
          chladni_mode: [5, 7],
          harmonic_lock: true,
          focus_state: 12
        })
      });
      return res.json();
    });

    expect(healthCheck.status).toBe('unlocked');
    expect(healthCheck.gateway).toBe('zenith_26');
    expect(healthCheck.token).toBe('aroha-33-verified');

    console.log('[+] Portal unlock verified via proxy:', healthCheck);
  });
});