module.exports = {
  apps: [
    {
      name: 'aroha-fastapi',
      cwd: 'C:\\Users\\Terry\\aroha-matrix',
      script: 'C:\\Users\\Terry\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      args: '-m uvicorn app:app --host 127.0.0.1 --port 8000',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
    {
      name: 'aroha-matrix-app',
      cwd: 'C:\\Users\\Terry\\aroha-matrix',
      script: 'C:\\Users\\Terry\\aroha-matrix\\server.cjs',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3013,
      },
    },
    {
      name: 'aroha-marimo',
      cwd: 'C:\\Users\\Terry\\aroha-matrix',
      script: 'C:\\Users\\Terry\\aroha-matrix\\venv\\Scripts\\python.exe',
      args: '-m marimo run marimo_vertebrae_sandbox.py --host 0.0.0.0 --port 8085 --headless',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};