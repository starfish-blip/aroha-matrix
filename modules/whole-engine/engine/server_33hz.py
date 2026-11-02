import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, HTTPServer
from transition_engine import TransitionEngine

ROOT_DIR = Path(__file__).resolve().parent.parent
ENGINE = TransitionEngine(base_freq=33.0)

class ArohaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/state":
            self._send_json(ENGINE.observe())
        elif self.path == "/api/tilt":
            record = ENGINE.tiki_tilt()
            ENGINE.save_manifest()
            self._send_json(record)
        else:
            super().do_GET()

    def _send_json(self, payload):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    port = 8033
    print(f"=== AROHA 33Hz LIVE BRIDGE SERVER RUNNING AT http://localhost:{port} ===")
    HTTPServer(("0.0.0.0", port), ArohaRequestHandler).serve_forever()