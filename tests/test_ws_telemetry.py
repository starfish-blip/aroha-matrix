import asyncio
import json
import httpx
import websockets

FASTAPI_HTTP = "http://127.0.0.1:8000/api/v1/portal/unlock"
FASTAPI_WS = "ws://127.0.0.1:8000/ws/telemetry" # Adjust route if configured in server_ws.py
EXPRESS_PORTAL = "http://127.0.0.1:3013"

async def test_stack():
    print("[*] Testing AROHA Matrix Telemetry Bridge...")
    
    # 1. Test FastAPI Portal Unlock HTTP Endpoint
    payload = {
        "vertebrae_count": 33,
        "chladni_mode": [5, 7],
        "harmonic_lock": True,
        "focus_state": 12
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(FASTAPI_HTTP, json=payload, timeout=5.0)
            print(f"[+] FastAPI HTTP Unlock Response ({response.status_code}):", response.json())
        except Exception as e:
            print("[-] FastAPI HTTP Error:", e)

        # 2. Test Express Server Health/Index
        try:
            exp_res = await client.get(EXPRESS_PORTAL, timeout=5.0)
            print(f"[+] Express Server (Port 3013) Status: {exp_res.status_code}")
        except Exception as e:
            print("[-] Express Server Error:", e)

    # 3. Test WebSocket Telemetry Stream
    try:
        print(f"[*] Connecting to WebSocket stream at {FASTAPI_WS}...")
        async with websockets.connect(FASTAPI_WS) as websocket:
            # Send initial handshake / UBO telemetry packet
            test_packet = json.dumps({"type": "ubo_sync", "harmonic_lock": True, "focus": 12})
            await websocket.send(test_packet)
            
            # Listen for incoming broadcast frame
            msg = await asyncio.wait_for(websocket.recv(), timeout=3.0)
            print("[+] WebSocket Telemetry Received:", msg)
    except Exception as e:
        print("[-] WebSocket Connection Note:", e)

if __name__ == "__main__":
    asyncio.run(test_stack())