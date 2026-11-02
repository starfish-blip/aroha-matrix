import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:8765",
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0,
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=angle"
      ]
    }
  },
  webServer: {
    command: "python -m uvicorn server_ws:app --host 127.0.0.1 --port 8765",
    url: "http://127.0.0.1:8765/api/health",
    reuseExistingServer: true,
    timeout: 20000
  }
});