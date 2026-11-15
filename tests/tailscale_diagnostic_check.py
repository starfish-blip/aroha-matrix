import urllib.request
import json
import time
import sys

TARGET_IP = "100.104.121.111"
PORTS = {
    "AROHA Voice Server": 8002,
    "AROHA Harmonization Server": 8001,
    "AROHA Matrix Web App": 3013
}

print(f"=== AROHA Tailscale Network Diagnostic ===")
print(f"Target Workstation IP: {TARGET_IP}\n")

for name, port in PORTS.items():
    url = f"http://{TARGET_IP}:{port}/health" if port != 3013 else f"http://{TARGET_IP}:{port}/"
    start_time = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AROHA-Diagnostic"})
        with urllib.request.urlopen(req, timeout=3.0) as response:
            latency = (time.time() - start_time) * 1000
            print(f"[ONLINE] {name} (Port {port}) - Status: {response.status} - Latency: {latency:.2f}ms")
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        print(f"[ONLINE (HTTP {e.code})] {name} (Port {port}) - Latency: {latency:.2f}ms")
    except Exception as e:
        print(f"[OFFLINE / BLOCKED] {name} (Port {port}) - Error: {e}")

print("\nDiagnostic check completed.")
