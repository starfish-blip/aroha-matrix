import math
import json
from pathlib import Path
from datetime import datetime

class TransitionEngine:
    def __init__(self, base_freq=33.0):
        self.base_freq = base_freq
        self.rotation_deg = 0
        self.compression = 0.50
        self.gate_state = "ON"
        self.history_log = []
        self.root_dir = Path(__file__).resolve().parent.parent

    def observe(self):
        return {
            "timestamp": datetime.now().isoformat(),
            "gate": self.gate_state,
            "rotation_deg": self.rotation_deg,
            "compression": self.compression,
            "carrier_freq": round(self.base_freq * (1 + (self.rotation_deg / 360) * 0.125), 2),
            "planes": {
                "bottom_ground": round(self.base_freq * 2, 2),
                "mid_plane": round(self.base_freq * 2 * 1.25 * (0.8 + self.compression * 0.4), 2),
                "top_plane": round(self.base_freq * 2 * 1.50 * (1.2 - self.compression * 0.4), 2)
            }
        }

    def compare(self, previous_state, current_state):
        delta_comp = abs(current_state["compression"] - previous_state["compression"])
        axis_shifted = current_state["rotation_deg"] != previous_state["rotation_deg"]
        equilibrium = "AXIS_ROTATED_90" if axis_shifted else ("STABLE" if delta_comp < 0.25 else "HIGH_TENSION")
        return {"equilibrium": equilibrium, "delta_compression": round(delta_comp, 4)}

    def tiki_tilt(self):
        prev_state = self.observe()
        self.rotation_deg = (self.rotation_deg + 90) % 360
        self.compression = round(0.3 + (math.sin(math.radians(self.rotation_deg)) + 1) * 0.2, 3)
        curr_state = self.observe()
        evaluation = self.compare(prev_state, curr_state)
        record = {
            "previous_rotation": prev_state["rotation_deg"],
            "current_rotation": curr_state["rotation_deg"],
            "evaluation": evaluation,
            "state": curr_state
        }
        self.history_log.append(record)
        return record

    def save_manifest(self):
        out_path = self.root_dir / "manifests" / "transition_log.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(self.history_log, f, indent=2)
        print(f"[OK] Transition log saved: {out_path}")

if __name__ == "__main__":
    engine = TransitionEngine(33.0)
    for _ in range(4):
        engine.tiki_tilt()
    engine.save_manifest()