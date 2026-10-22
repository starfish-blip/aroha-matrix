from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

app = FastAPI(title="AROHA Engine v34 Unified Platform", version="34.0.0")

# Mount static directory for frontend scripts and configs
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_controller():
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Index.html not found</h1>"

@app.get("/visualizer", response_class=HTMLResponse)
async def serve_visualizer():
    # Serves the dedicated secondary screen/projector visualizer view
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Visualizer template not found</h1>"

@app.get("/api/status")
async def api_status():
    return {
        "status": "success",
        "system": "AROHA v34 Matrix Engine",
        "mesh_node": "teabagged (Local Host)",
        "audio_engine": "active",
        "midi_status": "Oxygen 61 Ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=3000, reload=True)