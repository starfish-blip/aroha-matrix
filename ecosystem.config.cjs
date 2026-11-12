module.exports = {
  apps: [
    {
      name: "aroha-voice-server",
      script: "venv/Scripts/python",
      args: "-m uvicorn server_voice:app --host 0.0.0.0 --port 8002",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "aroha-harmonization-server",
      script: "venv/Scripts/python",
      args: "-m uvicorn server_ws:app --host 0.0.0.0 --port 8001",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "aroha-marimo-hub",
      script: "venv/Scripts/python",
      args: "-m marimo run aroha_hermes/notebooks/aroha_hermes_hub.py --host 0.0.0.0 --port 8080",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "aroha-matrix-app",
      script: "server.cjs",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        PORT: 3013,
        NODE_ENV: "production"
      }
    }
  ]
};
