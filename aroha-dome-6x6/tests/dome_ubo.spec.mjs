import { test, expect } from "@playwright/test";

test.describe("AROHA 6x6 WebGL2 std140 UBO & Point 26 Zenith Suite", () => {

  test("1. Verifies 64-byte hardware std140 UBO binding and clean WebGL2 program link", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/dome_preview.html");
    await expect(page.locator("#gpuStatus")).toContainText("64 bytes (std140 OK)", { timeout: 10000 });
    await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });

    const uboAudit = await page.evaluate(() => {
      const canvas = document.getElementById("glCanvas");
      const gl = canvas.getContext("webgl2");
      const prog = gl.getParameter(gl.CURRENT_PROGRAM);
      const blockIdx = gl.getUniformBlockIndex(prog, "ArohaTelemetryBlock");
      const blockSize = gl.getActiveUniformBlockParameter(prog, blockIdx, gl.UNIFORM_BLOCK_DATA_SIZE);
      const activeUniforms = gl.getActiveUniformBlockParameter(prog, blockIdx, gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS);

      const boundBuffer = gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0);
      gl.bindBuffer(gl.UNIFORM_BUFFER, boundBuffer);
      const gpuBufferBytes = gl.getBufferParameter(gl.UNIFORM_BUFFER, gl.BUFFER_SIZE);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);

      return {
        isWebGL2: gl instanceof WebGL2RenderingContext,
        blockIdx,
        blockSize,
        gpuBufferBytes,
        activeUniformCount: activeUniforms.length
      };
    });

    expect(uboAudit.isWebGL2).toBe(true);
    expect(uboAudit.blockIdx).toBeGreaterThanOrEqual(0);
    expect(uboAudit.blockSize).toBe(64);
    expect(uboAudit.gpuBufferBytes).toBe(64);
    expect(uboAudit.activeUniformCount).toBe(4);
    expect(consoleErrors).toEqual([]);
  });

  test("2. Verifies Step-3 Point 25 Handshake Markov distribution (r_zenith = 0.692388)", async ({ page }) => {
    await page.goto("/dome_preview.html");
    await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });

    await page.click("#btnReset");
    await page.click("#btnBridge");
    await page.click("#btnHold");

    await expect.poll(async () => {
      const txt = await page.locator("#readout").textContent();
      return txt ? JSON.parse(txt).states?.S25_Handshake : 0;
    }).toBeCloseTo(0.8, 4);

    await page.click("#btnConfirm");

    await expect.poll(async () => {
      const txt = await page.locator("#readout").textContent();
      return txt ? JSON.parse(txt).step : 0;
    }).toBe(3);

    const snap = JSON.parse(await page.locator("#readout").textContent());
    expect(snap.at_point_25).toBe(true);
    expect(snap.gate_action).toBe("confirm");
    expect(snap.states.S3_Terra).toBeCloseTo(0.008, 5);
    expect(snap.states.S2_Bridge).toBeCloseTo(0.032, 5);
    expect(snap.states.S25_Handshake).toBeCloseTo(0.160, 5);
    expect(snap.states.E26_Red).toBeCloseTo(0.480, 5);
    expect(snap.states.E26_Green).toBeCloseTo(0.200, 5);
    expect(snap.states.E26_Blue).toBeCloseTo(0.120, 5);
    expect(snap.metrics.coherence_c26).toBeCloseTo(0.31104, 4);
    expect(snap.metrics.r_zenith).toBeCloseTo(0.692388, 4);
  });

  test("3. Verifies Point 26 Deadbeat Zenith convergence (r_zenith = 1.0, C26 = 1.0) in GPU UBO registers", async ({ page }) => {
    await page.goto("/dome_preview.html");
    await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });

    await page.click("#btnReset");
    await page.click("#btnDeadbeat");

    await expect.poll(async () => {
      const txt = await page.locator("#readout").textContent();
      return txt ? JSON.parse(txt).metrics?.r_zenith : 0;
    }, { timeout: 8000 }).toBeCloseTo(1.0, 4);

    // Read the 16 float32 registers (64 bytes) directly back from GPU Uniform Buffer binding 0
    const gpuRegisters = await page.evaluate(() => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          const canvas = document.getElementById("glCanvas");
          const gl = canvas.getContext("webgl2");
          const boundBuffer = gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0);
          const readback = new Float32Array(16);
          gl.bindBuffer(gl.UNIFORM_BUFFER, boundBuffer);
          gl.getBufferSubData(gl.UNIFORM_BUFFER, 0, readback);
          gl.bindBuffer(gl.UNIFORM_BUFFER, null);
          resolve(Array.from(readback));
        });
      });
    });

    expect(gpuRegisters[3]).toBeCloseTo(8.6537279, 4); // u_zone_lower.w  = Bessel root x
    expect(gpuRegisters[4]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.x = E26_Red
    expect(gpuRegisters[5]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.y = E26_Green
    expect(gpuRegisters[6]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.z = E26_Blue
    expect(gpuRegisters[7]).toBeCloseTo(1.0, 4);       // u_point26_rgb.w = r_zenith
    expect(gpuRegisters[8]).toBeCloseTo(1.0, 4);       // u_dome_metrics.x = C26
  });
});