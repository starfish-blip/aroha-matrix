# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dome_ubo.spec.mjs >> AROHA 6x6 WebGL2 std140 UBO & Point 26 Zenith Suite >> 1. Verifies 64-byte hardware std140 UBO binding and clean WebGL2 program link
- Location: tests\dome_ubo.spec.mjs:5:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 4
Received: undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - complementary [ref=e2]:
    - heading "AROHA 6x6 WebSocket UBO" [level=1] [ref=e3]
    - generic [ref=e4]: "GPU UBO Bound: 64 bytes (std140 OK)"
    - generic [ref=e5]: "LIVE Python WS: ws://127.0.0.1:8765/ws/ubo"
    - generic [ref=e6]:
      - button "1. Propagate (x=5.0)" [ref=e7] [cursor=pointer]
      - button "2. Lock P25 Hold" [ref=e8] [cursor=pointer]
      - button "3. Confirm Handshake" [ref=e9] [cursor=pointer]
      - button "Reject to Terra" [ref=e10] [cursor=pointer]
      - button "Deadbeat (k=1/3)" [ref=e11] [cursor=pointer]
      - button "Reset Terra" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: RGB Coupling (kappa)
        - generic [ref=e16]: "0.250"
      - slider [ref=e17]: "0.25"
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]: Green Terra Drain (gamma_G)
        - generic [ref=e21]: "0.00"
      - slider [ref=e22]: "0"
    - generic [ref=e23]: "RX #13 (64B IEEE-754 std140) u_zone_lower [0..3] : 1.000, 0.000, 0.000, x=0.0000 u_point26_rgb [4..7] : R=0.000, G=0.000, B=0.000, rZ=0.0000 u_dome_metrics[8..11]: C26=0.0000, J0=1.00e+0, gate=0"
    - generic [ref=e24]: "{ \"step\": 0, \"x\": 0, \"j0\": 1, \"at_point_25\": false, \"at_zenith_lock\": false, \"gate_action\": \"hold\", \"states\": { \"S3_Terra\": 1, \"S2_Bridge\": 0, \"S25_Handshake\": 0, \"E26_Red\": 0, \"E26_Green\": 0, \"E26_Blue\": 0 }, \"metrics\": { \"l1_total_mass\": 1, \"dome_rgb_mass\": 0, \"rg_contrast\": 0, \"coherence_c26\": 0, \"r_zenith\": 0 }, \"params\": { \"kappa\": 0.25, \"gamma_g\": 0, \"stream_hz\": 60 } }"
  - main [ref=e25]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("AROHA 6x6 WebGL2 std140 UBO & Point 26 Zenith Suite", () => {
  4   | 
  5   |   test("1. Verifies 64-byte hardware std140 UBO binding and clean WebGL2 program link", async ({ page }) => {
  6   |     const consoleErrors = [];
  7   |     page.on("console", (msg) => {
  8   |       if (msg.type() === "error") consoleErrors.push(msg.text());
  9   |     });
  10  | 
  11  |     await page.goto("/dome_preview.html");
  12  |     await expect(page.locator("#gpuStatus")).toContainText("64 bytes (std140 OK)", { timeout: 10000 });
  13  |     await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });
  14  | 
  15  |     const uboAudit = await page.evaluate(() => {
  16  |       const canvas = document.getElementById("glCanvas");
  17  |       const gl = canvas.getContext("webgl2");
  18  |       const prog = gl.getParameter(gl.CURRENT_PROGRAM);
  19  |       const blockIdx = gl.getUniformBlockIndex(prog, "ArohaTelemetryBlock");
  20  |       const blockSize = gl.getActiveUniformBlockParameter(prog, blockIdx, gl.UNIFORM_BLOCK_DATA_SIZE);
  21  |       const activeUniforms = gl.getActiveUniformBlockParameter(prog, blockIdx, gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS);
  22  | 
  23  |       const boundBuffer = gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0);
  24  |       gl.bindBuffer(gl.UNIFORM_BUFFER, boundBuffer);
  25  |       const gpuBufferBytes = gl.getBufferParameter(gl.UNIFORM_BUFFER, gl.BUFFER_SIZE);
  26  |       gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  27  | 
  28  |       return {
  29  |         isWebGL2: gl instanceof WebGL2RenderingContext,
  30  |         blockIdx,
  31  |         blockSize,
  32  |         gpuBufferBytes,
  33  |         activeUniformCount: activeUniforms.length
  34  |       };
  35  |     });
  36  | 
  37  |     expect(uboAudit.isWebGL2).toBe(true);
  38  |     expect(uboAudit.blockIdx).toBeGreaterThanOrEqual(0);
  39  |     expect(uboAudit.blockSize).toBe(64);
  40  |     expect(uboAudit.gpuBufferBytes).toBe(64);
> 41  |     expect(uboAudit.activeUniformCount).toBe(4);
      |                                         ^ Error: expect(received).toBe(expected) // Object.is equality
  42  |     expect(consoleErrors).toEqual([]);
  43  |   });
  44  | 
  45  |   test("2. Verifies Step-3 Point 25 Handshake Markov distribution (r_zenith = 0.692388)", async ({ page }) => {
  46  |     await page.goto("/dome_preview.html");
  47  |     await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });
  48  | 
  49  |     await page.click("#btnReset");
  50  |     await page.click("#btnBridge");
  51  |     await page.click("#btnHold");
  52  | 
  53  |     await expect.poll(async () => {
  54  |       const txt = await page.locator("#readout").textContent();
  55  |       return txt ? JSON.parse(txt).states?.S25_Handshake : 0;
  56  |     }).toBeCloseTo(0.8, 4);
  57  | 
  58  |     await page.click("#btnConfirm");
  59  | 
  60  |     await expect.poll(async () => {
  61  |       const txt = await page.locator("#readout").textContent();
  62  |       return txt ? JSON.parse(txt).step : 0;
  63  |     }).toBe(3);
  64  | 
  65  |     const snap = JSON.parse(await page.locator("#readout").textContent());
  66  |     expect(snap.at_point_25).toBe(true);
  67  |     expect(snap.gate_action).toBe("confirm");
  68  |     expect(snap.states.S3_Terra).toBeCloseTo(0.008, 5);
  69  |     expect(snap.states.S2_Bridge).toBeCloseTo(0.032, 5);
  70  |     expect(snap.states.S25_Handshake).toBeCloseTo(0.160, 5);
  71  |     expect(snap.states.E26_Red).toBeCloseTo(0.480, 5);
  72  |     expect(snap.states.E26_Green).toBeCloseTo(0.200, 5);
  73  |     expect(snap.states.E26_Blue).toBeCloseTo(0.120, 5);
  74  |     expect(snap.metrics.coherence_c26).toBeCloseTo(0.31104, 4);
  75  |     expect(snap.metrics.r_zenith).toBeCloseTo(0.692388, 4);
  76  |   });
  77  | 
  78  |   test("3. Verifies Point 26 Deadbeat Zenith convergence (r_zenith = 1.0, C26 = 1.0) in GPU UBO registers", async ({ page }) => {
  79  |     await page.goto("/dome_preview.html");
  80  |     await expect(page.locator("#wsStatus")).toContainText("LIVE Python WS", { timeout: 10000 });
  81  | 
  82  |     await page.click("#btnReset");
  83  |     await page.click("#btnDeadbeat");
  84  | 
  85  |     await expect.poll(async () => {
  86  |       const txt = await page.locator("#readout").textContent();
  87  |       return txt ? JSON.parse(txt).metrics?.r_zenith : 0;
  88  |     }, { timeout: 8000 }).toBeCloseTo(1.0, 4);
  89  | 
  90  |     // Read the 16 float32 registers (64 bytes) directly back from GPU Uniform Buffer binding 0
  91  |     const gpuRegisters = await page.evaluate(() => {
  92  |       return new Promise((resolve) => {
  93  |         requestAnimationFrame(() => {
  94  |           const canvas = document.getElementById("glCanvas");
  95  |           const gl = canvas.getContext("webgl2");
  96  |           const boundBuffer = gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0);
  97  |           const readback = new Float32Array(16);
  98  |           gl.bindBuffer(gl.UNIFORM_BUFFER, boundBuffer);
  99  |           gl.getBufferSubData(gl.UNIFORM_BUFFER, 0, readback);
  100 |           gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  101 |           resolve(Array.from(readback));
  102 |         });
  103 |       });
  104 |     });
  105 | 
  106 |     expect(gpuRegisters[3]).toBeCloseTo(8.6537279, 4); // u_zone_lower.w  = Bessel root x
  107 |     expect(gpuRegisters[4]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.x = E26_Red
  108 |     expect(gpuRegisters[5]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.y = E26_Green
  109 |     expect(gpuRegisters[6]).toBeCloseTo(1 / 3, 4);     // u_point26_rgb.z = E26_Blue
  110 |     expect(gpuRegisters[7]).toBeCloseTo(1.0, 4);       // u_point26_rgb.w = r_zenith
  111 |     expect(gpuRegisters[8]).toBeCloseTo(1.0, 4);       // u_dome_metrics.x = C26
  112 |   });
  113 | });
```