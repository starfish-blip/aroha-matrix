module.exports = {
  apps: [
    {
      name: "aroha-fastapi",
      script: "python",
      args: "-m uvicorn app:app --host 127.0.0.1 --port 8000",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      interpreter: "none",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "aroha-matrix-app",
      script: "server.cjs",
      cwd: "C:\\Users\\terry\\aroha-matrix",
      interpreter: "node",
      env: {
        PORT: 3013,
        NODE_ENV: "production"
      }
    }
  ]
};
