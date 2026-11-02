from fastapi.testclient import TestClient
from server_ws import app

with TestClient(app) as client:
    with client.websocket_connect("/ws/ubo") as ws:
        for i in range(6):
            message = ws.receive()
            if message.get("bytes") is not None:
                print(i, "BINARY", len(message["bytes"]), "bytes")
            elif message.get("text") is not None:
                print(i, "TEXT", message["text"][:300])
            else:
                print(i, "OTHER", message)
