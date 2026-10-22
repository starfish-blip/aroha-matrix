from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import os
import json
from datetime import datetime

app = FastAPI(title="AROHA Funnel & Digital Product Engine")

@app.get("/api/package-session")
def package_session(profile: str = "Terry Stohr", node: int = 15):
    """
    Packages session telemetry, preset configuration, and matrix node data 
    into a structured digital product manifest for starmaps13.com customers.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    package_id = f"AROHA-Sess-{timestamp}"
    
    manifest = {
        "package_id": package_id,
        "operator": profile,
        "chamber_node": node,
        "created_at": datetime.now().isoformat(),
        "assets": [
            "aroha_audio_visual_stream.webm",
            "sacred_solfeggio_preset_v34.json",
            "cymatic_resonance_map.png"
        ],
        "status": "Ready for Digital Delivery / Stripe Checkout Fulfillment"
    }
    
    # Save local manifest backup
    os.makedirs("exports", exist_ok=True)
    file_path = os.path.join("exports", f"{package_id}.json")
    with open(file_path, "w") as f:
        json.dump(manifest, f, indent=2)
        
    return JSONResponse(content={
        "status": "success",
        "message": "Digital product package generated successfully.",
        "manifest": manifest
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)