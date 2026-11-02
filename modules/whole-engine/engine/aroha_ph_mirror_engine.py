import math
import json
import wave
import struct
from pathlib import Path
from datetime import datetime

class ArohaPhMirrorEngine:
    def __init__(self, base_freq=33.0, sample_rate=44100):
        self.base_freq = base_freq
        self.triad_unit = base_freq / 3.0  # 11.0 Hz
        self.sample_rate = sample_rate
        self.beat_hz = base_freq / 16.0
        self.step_duration = 1.0 / self.beat_hz
        self.root_dir = Path(__file__).resolve().parent.parent
        self.manifest = []

    def execute_triad_mirror(self):
        wav_path = self.root_dir / "audio" / "aroha_ph_mirror_33hz.wav"
        json_path = self.root_dir / "manifests" / "aroha_ph_mirror_manifest.json"
        audio_samples = []

        for step in range(1, 16):
            ph_val = step - 1
            mirror_dist = ph_val - 7

            if step <= 5:
                zone, phonetic_op = "ZONE_1_ACIDIC_COMPRESSION", "P + H -> PH (F)"
            elif step <= 10:
                zone = "ZONE_2_NEUTRAL_MIRROR_H"
                phonetic_op = "H (CENTRAL_BRIDGE)" if step == 8 else "W + H -> WHOLE"
            else:
                zone, phonetic_op = "ZONE_3_ALKALINE_EXPANSION", "F -> E (3_PLANES)"

            compression = round(0.50 - (mirror_dist / 14.0) * 0.40, 3)
            rotation_deg = (abs(mirror_dist) * 90) % 360

            f_root = self.base_freq
            f_triad_mid = self.triad_unit * 2.0
            f_plane_bot = self.base_freq * 2.0
            f_plane_mid = self.base_freq * 2.0 * (1.0 + compression)
            f_plane_top = self.base_freq * 3.0 * (1.5 - compression)
            gate_gain = 1.0 if step in (1, 8, 15) else (0.85 if step % 2 == 1 else 0.35)

            num_samples = int(self.step_duration * self.sample_rate)
            for n in range(num_samples):
                t = n / self.sample_rate
                env = math.sin(math.pi * (n / num_samples))
                sig = (
                    0.40 * math.sin(2 * math.pi * f_root * t) +
                    0.20 * math.sin(2 * math.pi * f_triad_mid * t) +
                    0.15 * math.sin(2 * math.pi * f_plane_bot * t) +
                    0.15 * math.sin(2 * math.pi * f_plane_mid * t) +
                    0.10 * math.sin(2 * math.pi * f_plane_top * t)
                )
                sample = max(-1.0, min(1.0, sig * gate_gain * env))
                audio_samples.append(int(sample * 32767))

            self.manifest.append({
                "step": step,
                "ph_value": ph_val,
                "mirror_offset": mirror_dist,
                "triad_zone": zone,
                "phonetic_operator": phonetic_op,
                "rotation_deg": rotation_deg,
                "compression": compression
            })

        with wave.open(str(wav_path), "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(struct.pack(f"<{len(audio_samples)}h", *audio_samples))

        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "architecture": "15-Step pH (0-14) Mirror & 3x5 Triadic Split",
                "steps": self.manifest
            }, jf, indent=2)

        print(f"[OK] WAV saved: {wav_path}")
        print(f"[OK] Manifest saved: {json_path}")

if __name__ == "__main__":
    ArohaPhMirrorEngine().execute_triad_mirror()