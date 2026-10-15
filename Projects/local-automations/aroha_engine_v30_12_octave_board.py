from fastapi import FastAPI, WebSocket
import json

app = FastAPI()

@app.websocket("/ws/aroha")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        payload = json.loads(data)
        # Process parameter adjustments through the 12-octave matrix
        response_payload = {"status": "synchronized", "received": payload}
        await websocket.send_text(json.dumps(response_payload))
