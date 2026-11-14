module.exports = {
  apps: [
    {
      name: 'aroha-matrix-app',
      script: './server.cjs',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3013
      }
    },
    {
      name: 'aroha-fastapi',
      script: './app.py',
      interpreter: 'python',
      max_memory_restart: '300M',
      env: {
        PORT: 8000
      }
    }
  ]
};
