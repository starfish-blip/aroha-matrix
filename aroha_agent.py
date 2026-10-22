from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import datetime
import json
import os

app = FastAPI(title="AROHA Agent Telemetry Daemon", version="34.0.0")

class TelemetryEvent(BaseModel):
    event_type: str
    value: float
    timestamp: str = None

@app.post("/api/telemetry")
async def receive_telemetry(event: TelemetryEvent):
    event.timestamp = datetime.datetime.now().isoformat()
    
    os.makedirs("logs", exist_ok=True)
    log_file = "logs/telemetry_stream.jsonl"
    
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(event.dict()) + "\n")
        
    return {"status": "logged", "event": event.event_type, "timestamp": event.timestamp}

@app.get("/api/telemetry/stats")
async def get_stats():
    log_file = "logs/telemetry_stream.jsonl"
    count = 0
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            count = sum(1 for _ in f)
    return {"total_events_logged": count, "daemon_status": "active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aroha_agent:app", host="127.0.0.1", port=5000, reload=True)