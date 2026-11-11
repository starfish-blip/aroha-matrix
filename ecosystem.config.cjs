module.exports = {
  apps: [
    {
      name: 'aroha-matrix',
      script: 'server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        PORT: 3013,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'aroha-fastapi',
      script: 'fastapi-runner.cjs',
      autorestart: true,
      watch: false,
      max_memory_restart: '250M'
    }
  ]
};
