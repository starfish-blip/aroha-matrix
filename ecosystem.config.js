module.exports = {
  apps: [
    {
      name: "aroha-fastapi",
      script: "uvicorn",
      args: "main:app --host 127.0.0.1 --port 8000 --reload",
      interpreter: "python",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "aroha-celery-worker",
      script: "celery",
      args: "-A celery_worker.celery_app worker --loglevel=info --pool=solo",
      interpreter: "python",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
