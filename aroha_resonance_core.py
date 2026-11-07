import threading
import hashlib
import json
import time
import math
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

PORT = 8080
LEDGER_FILE = "aroha_ledger.json"
LEDGER_LOCK = threading.Lock()

# 6-Tier Consciousness Scale
TIERS = {
    1: {"name": "Hau",          "y_target": 0.10, "thermal": 24.6, "gamma": 0.05, "disp": 0.08},
    2: {"name": "Mauri",        "y_target": 0.25, "thermal": 27.2, "gamma": 0.30, "disp": 0.12},
    3: {"name": "Wairua",       "y_target": 0.42, "thermal": 29.8, "gamma": 0.60, "disp": 0.16},
    4: {"name": "Hinengaro",    "y_target": 0.58, "thermal": 32.4, "gamma": 1.00, "disp": 0.20},
    5: {"name": "Whatungarongaro", "y_target": 0.75, "thermal": 35.1, "gamma": 1.45, "disp": 0.24},
    6: {"name": "Sentient Dome","y_target": 0.95, "thermal": 38.1, "gamma": 1.85, "disp": 0.28},
}

# 6-Key Vocal Gate â€” C is the anchor
VOWELS = {
    "C": {"freq": 261.63, "thermal": 36.6, "phase": 0.00, "formant1": 800,  "formant2": 1200},
    "A": {"freq": 220.00, "thermal": 35.2, "phase": 0.52, "formant1": 850,  "formant2": 1610},
    "E": {"freq": 329.63, "thermal": 36.0, "phase": 1.05, "formant1": 400,  "formant2": 2300},
    "I": {"freq": 349.23, "thermal": 36.4, "phase": 1.57, "formant1": 300,  "formant2": 2900},
    "O": {"freq": 392.00, "thermal": 36.8, "phase": 2.09, "formant1": 500,  "formant2": 900},
    "U": {"freq": 440.00, "thermal": 37.1, "phase": 2.62, "formant1": 400,  "formant2": 800},
}

# True cross-partition ring pairs â€” fixes diagonal bug
RING_PAIRS = [(0, 2), (1, 3), (0, 1), (2, 3)]

# Maramataka lunar phases
MARAMATAKA = {
    "Rakaunui": 0.22,
    "Whiro":   -0.22,
    "Neutral":  0.00,
}

# â”€â”€â”€ Quantum State Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

W_LOCK = threading.Lock()

def build_W_matrix(tier: int, vowel: str) -> list:
    """Build 4x4 entanglement weight matrix from tier + vowel."""
    t = TIERS.get(tier, TIERS[1])
    v = VOWELS.get(vowel, VOWELS["C"])
    base = t["gamma"] * math.cos(v["phase"])
    W = [[0.0] * 4 for _ in range(4)]
    for (i, j) in RING_PAIRS:
        val = base * (1.0 + 0.1 * i - 0.05 * j)
        W[i][j] = val
        W[j][i] = val
    return W

def compute_entanglement_entropy(W: list) -> float:
    """Compute S(rho_A) â€” Von Neumann entropy proxy from W matrix."""
    total = 0.0
    for row in W:
        for val in row:
            if abs(val) > 1e-9:
                p = abs(val) / (abs(val) + 1.0)
                total -= p * math.log2(p + 1e-12)
    return round(total, 6)

def build_client_fallback_frame(tier: int, vowel: str, ladder: int,
                                 maramataka: str, step: int) -> dict:
    """Serverless fallback â€” synthesises state without Ollama."""
    t = TIERS.get(tier, TIERS[1])
    v = VOWELS.get(vowel, VOWELS["C"])
    W = build_W_matrix(tier, vowel)
    S = compute_entanglement_entropy(W)
    lunar = MARAMATAKA.get(maramataka, 0.0)
    return {
        "source": "STATIC CLIENT",
        "tier": tier,
        "tier_name": t["name"],
        "vowel": vowel,
        "freq_hz": v["freq"],
        "thermal": t["thermal"],
        "gamma": t["gamma"],
        "disp": t["disp"],
        "y_target": t["y_target"],
        "ladder": ladder,
        "maramataka": maramataka,
        "lunar_bias": lunar,
        "S_rho_A": S,
        "step": step,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

# â”€â”€â”€ Ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def load_ledger() -> list:
    if not os.path.exists(LEDGER_FILE):
        return []
    with open(LEDGER_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_ledger(blocks: list):
    with open(LEDGER_FILE, "w", encoding="utf-8") as f:
        json.dump(blocks, f, indent=2)

def append_ledger_block(payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True)
    block_hash = hashlib.sha256(raw.encode()).hexdigest()
    with LEDGER_LOCK:
        blocks = load_ledger()
        blocks.append({
            "hash": block_hash,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        save_ledger(blocks)
    return block_hash

# â”€â”€â”€ Oracle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def query_ollama(prompt: str) -> str:
    """Try local Ollama first, then give up gracefully."""
    try:
        import urllib.request
        data = json.dumps({
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }).encode()
        req = urllib.request.Request(
            "http://0.0.0.0:11434/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode())
            return result.get("response", "").strip()
    except Exception:
        return None

def synthesise_oracle_response(payload: dict) -> str:
    """Python Quantum State Synthesizer â€” offline fallback."""
    tier_name = TIERS.get(payload.get("tier", 1), TIERS[1])["name"]
    S = payload.get("S_rho_A", 0.0)
    freq = payload.get("freq_hz", 261.63)
    ladder = payload.get("ladder", 1)
    phase = "ascending" if ladder <= 3 else "peak" if ladder <= 6 else "descending"
    return (
        f"[Local Synth] Tier {payload.get('tier')} â€” {tier_name}. "
        f"Resonance at {freq:.2f} Hz. "
        f"Entanglement entropy S(Ï_A) = {S:.4f} bits. "
        f"Ladder phase: {phase}. "
        f"Maramataka: {payload.get('maramataka', 'Neutral')}. "
        f"The field is {'coherent' if S > 0.05 else 'initialising'}."
    )

# â”€â”€â”€ HTTP Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ArohaHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # Silence default Apache-style logs

    def send_json(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_cors_preflight(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode())
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_cors_preflight()

    def do_GET(self):
        # Serve static files
        if self.path in ("/", "/index.html"):
            self._serve_file("aroha-master-matrix/index.html", "text/html")
        elif self.path == "/aroha_master_matrix_app.html":
            self._serve_file("aroha-master-matrix/index.html", "text/html")
        elif self.path == "/api/ledger":
            with LEDGER_LOCK:
                blocks = load_ledger()
            self.send_json(200, {"blocks": blocks[-5:]})
        elif self.path == "/api/status":
            self.send_json(200, {"status": "ok", "version": "v40.1"})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        body = self.read_body()

        if self.path == "/api/step":
            tier   = int(body.get("tier", 1))
            vowel  = body.get("vowel", "C")
            ladder = int(body.get("ladder", 1))
            maramataka = body.get("maramataka", "Neutral")
            step   = int(body.get("step", 0))
            frame  = build_client_fallback_frame(
                tier, vowel, ladder, maramataka, step)
            self.send_json(200, frame)

        elif self.path == "/api/handshake":
            action = body.get("action", "")
            if action == "confirm":
                W = build_W_matrix(
                    int(body.get("tier", 1)),
                    body.get("vowel", "C")
                )
                S = compute_entanglement_entropy(W)
                payload = {
                    "action": "confirm",
                    "tier": body.get("tier", 1),
                    "vowel": body.get("vowel", "C"),
                    "S_rho_A": S,
                    "empirical_validity": 1.0,
                }
                block_hash = append_ledger_block(payload)
                self.send_json(200, {
                    "status": "confirmed",
                    "hash": block_hash,
                    "empirical_validity": 1.0,
                    "S_rho_A": S,
                })
            elif action == "reject":
                self.send_json(200, {
                    "status": "rejected",
                    "empirical_validity": 0.0,
                })
            else:
                self.send_json(400, {"error": "unknown action"})

        elif self.path == "/api/oracle":
            tier     = int(body.get("tier", 1))
            vowel    = body.get("vowel", "C")
            ladder   = int(body.get("ladder", 1))
            maramataka = body.get("maramataka", "Neutral")
            W = build_W_matrix(tier, vowel)
            S = compute_entanglement_entropy(W)
            t = TIERS.get(tier, TIERS[1])
            v = VOWELS.get(vowel, VOWELS["C"])
            oracle_payload = {
                "tier": tier,
                "tier_name": t["name"],
                "vowel": vowel,
                "freq_hz": v["freq"],
                "thermal": t["thermal"],
                "ladder": ladder,
                "maramataka": maramataka,
                "S_rho_A": S,
            }
            prompt = (
                f"You are the AROHA Oracle. Current state: "
                f"Tier {tier} ({t['name']}), Vowel {vowel} at {v['freq']:.2f}Hz, "
                f"Thermal {t['thermal']}C, Ladder level {ladder}, "
                f"Maramataka {maramataka}, "
                f"Entanglement entropy S(rho_A) = {S:.4f} bits. "
                f"Give a brief poetic resonance reading in 2-3 sentences."
            )
            reply = query_ollama(prompt)
            source = "Ollama"
            if reply is None:
                reply = synthesise_oracle_response(oracle_payload)
                source = "Local Synth"
            self.send_json(200, {
                "reply": reply,
                "source": source,
                "S_rho_A": S,
                "freq_hz": v["freq"],
            })

        else:
            self.send_json(404, {"error": "unknown endpoint"})

    def _serve_file(self, path: str, content_type: str):
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_json(404, {"error": f"{path} not found"})

# â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

if __name__ == "__main__":
    print(f"AROHA Resonance Core v40.1")
    print(f"Server starting on http://0.0.0.0:{PORT}")
    print(f"Ledger: {LEDGER_FILE}")
    print(f"Endpoints: /api/step  /api/handshake  /api/oracle  /api/ledger")
    server = HTTPServer(("0.0.0.0", PORT), ArohaHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")



