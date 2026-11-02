import json
import struct
from fastapi.testclient import TestClient
from server_ws import app

def receive_pair(ws, label):
    """Read messages until one JSON HUD and one 64-byte frame arrive."""
    hud = None
    frame = None

    for _ in range(10):
        message = ws.receive()

        if message.get("text") is not None:
            try:
                hud = json.loads(message["text"])
            except json.JSONDecodeError:
                continue

        elif message.get("bytes") is not None:
            frame = message["bytes"]

        if hud is not None and frame is not None:
            break

    assert hud is not None, f"{label}: no JSON HUD received"
    assert frame is not None, f"{label}: no binary frame received"
    assert len(frame) == 64, f"{label}: frame was {len(frame)} bytes"

    values = struct.unpack("<16f", frame)
    print(f"\n--- {label} ---")
    print("Step:", hud.get("step"))
    print("x:", hud.get("x"))
    print("RGB:", values[4:7])
    print("r_zenith:", values[7])
    print("C26:", values[8])
    print("HUD metrics:", hud.get("metrics"))
    return hud, values

with TestClient(app) as client:
    response = client.get("/api/health")
    response.raise_for_status()
    health = response.json()
    print("Health:", health)
    assert health["ubo_bytes"] == 64

    with client.websocket_connect("/ws/ubo") as ws:
        # Initial state: server sends HUD first, then binary frame.
        initial_hud = json.loads(ws.receive_text())
        initial_frame = ws.receive_bytes()
        assert len(initial_frame) == 64
        print("\nInitial state:", initial_hud.get("step"), initial_hud.get("x"))

        # Send one command, then read the resulting messages by type.
        for command, label in [
            ({"cmd": "step", "x": 5.0, "action": "hold"}, "x = 5.0"),
            ({"cmd": "step", "x": 8.6537279, "action": "hold"}, "target root"),
            ({"cmd": "deadbeat"}, "deadbeat 1"),
            ({"cmd": "deadbeat"}, "deadbeat 2"),
        ]:
            ws.send_json(command)
            receive_pair(ws, label)

print("\nPASS: health endpoint and 64-byte WebSocket frames verified.")
