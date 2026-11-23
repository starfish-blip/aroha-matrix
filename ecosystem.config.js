module.exports = {
  apps: [
    {
      name: "aroha-fastapi",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      script: "start_fastapi.py",
      interpreter: "python",
      args: "--host 0.0.0.0 --port 8000",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        PYTHONUNBUFFERED: "1",
        AROHA_ENV: "local",
        AROHA_ZONES: "zone1-anchor,zone2-harmonic-star,zone3-mesh-telemetry",
        AROHA_FULCRUM_C: "36.6",
        AROHA_THETA_HZ: "6.0",
        AROHA_MAX_FLICKER_HZ: "3.0",
        AROHA_FADER_MIN_HZ: "108",
        AROHA_FADER_MAX_HZ: "442368",
        AROHA_UBO_BYTES: "48",
        TAILSCALE_HOST: process.env.TAILSCALE_HOST || "terrys-s24-ultra",
        OLLAMA_HOST: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5-coder"
      }
    },
    {
      name: "aroha-marimo",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      script: "python",
      args: "-m marimo edit marimo_vertebrae_sandbox.py --host 0.0.0.0 --port 8085 --headless --no-token",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        PYTHONUNBUFFERED: "1",
        AROHA_SANDBOX_PORT: "8085",
        AROHA_API_URL: "http://127.0.0.1:8000",
        TAILSCALE_HOST: process.env.TAILSCALE_HOST || "terrys-s24-ultra",
        OLLAMA_HOST: process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
      }
    },
    {
      name: "aroha-ollama-bridge",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      script: "node",
      args: "-e \"const http=require('http'); const target=process.env.OLLAMA_HOST||'http://127.0.0.1:11434'; http.createServer((req,res)=>{ if(req.url==='/health'){ res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify({ok:true,ollamaHost:target,tailscaleHost:process.env.TAILSCALE_HOST||'terrys-s24-ultra'})); } res.writeHead(404); res.end(); }).listen(8090,'0.0.0.0');\"",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        TAILSCALE_HOST: process.env.TAILSCALE_HOST || "terrys-s24-ultra",
        OLLAMA_HOST: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5-coder"
      }
    }
  ]
};