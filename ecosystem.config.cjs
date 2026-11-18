const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const VENV_PY = path.join(ROOT_DIR, 'venv', 'Scripts', 'python.exe');
const LOCAL_PY312 = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe');
const SYS_PY = process.env.AROHA_PYTHON || (fs.existsSync(LOCAL_PY312) ? LOCAL_PY312 : 'python');

module.exports = {
  apps: [
    {
      name: 'aroha-fastapi',
      cwd: ROOT_DIR,
      script: SYS_PY,
      args: '-m uvicorn app:app --host 127.0.0.1 --port 8000',
      interpreter: 'none',
      windowsHide: true,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
      watch: false,
      env: { PYTHONUNBUFFERED: '1' },
    },
    {
      name: 'aroha-matrix-app',
      cwd: ROOT_DIR,
      script: path.join(ROOT_DIR, 'server.cjs'),
      windowsHide: true,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3013 },
    },
    {
      name: 'aroha-marimo',
      cwd: ROOT_DIR,
      script: VENV_PY,
      args: '-m marimo run marimo_vertebrae_sandbox.py --host 0.0.0.0 --port 8085 --headless',
      interpreter: 'none',
      windowsHide: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 5,
      watch: false,
      env: { PYTHONUNBUFFERED: '1' },
    },
  ],
};