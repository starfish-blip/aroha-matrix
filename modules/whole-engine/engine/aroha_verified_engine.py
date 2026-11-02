import math
import json
import wave
import struct
from pathlib import Path
from datetime import datetime

class ArohaVerifiedEngine:
    def __init__(self, base_freq=33.0, sample_rate=44100):
        self.base_freq = base_freq
        self.sample_rate = sample_rate
        self.beat_hz = base_freq / 16.0  # 2.0625 Hz (123.75 BPM)
        self.step_duration = 1.0 / self.beat_hz
        self.rotation_deg = 0
        self.compression = 0.50
        self.root_dir = Path(__file__).resolve().parent.parent
        self.manifest = []

    def run_15_step_fold(self):
        wav_path = self.root_dir / "audio" / "aroha_tik_toc_boom.wav"
        json_path = self.root_dir / "manifests" / "aroha_verified_manifest.json"
        audio_samples = []

        for step in range(1, 16):
            if step == 1:
                role, gate_gain = "GENESIS_ON (TIK)", 1.0
            elif step == 8:
                role, gate_gain = "MIDPOINT_MIRROR (BOTH_WAYS)", 0.65
            elif step == 15:
                role, gate_gain = "THRESHOLD_BOOM (PHASE_SNAP)", 1.0
            else:
                is_tik = (step % 2 == 1)
                role = "TIK_ON" if is_tik else "TOC_RECIPROCAL"
                gate_gain = 0.9 if is_tik else 0.25

            if step in (1, 5, 9, 13, 15):
                self.rotation_deg = (self.rotation_deg + 90) % 360

            self.compression = round(0.3 + (math.sin(math.radians(self.rotation_deg)) + 1) * 0.2, 3)
            rot_mod = 1.0 + (self.rotation_deg / 360.0) * 0.125
            f_carrier = self.base_freq * rot_mod
            f_ground_L = self.base_freq * 2.0 * rot_mod
            f_mid_plane = self.base_freq * 2.0 * 1.25 * (0.8 + self.compression * 0.4)
            f_top_plane = self.base_freq * 2.0 * 1.50 * (1.2 - self.compression * 0.4)

            num_samples = int(self.step_duration * self.sample_rate)
            for n in range(num_samples):
                t = n / self.sample_rate
                env = math.sin(math.pi * (n / num_samples))
                sig = (
                    0.45 * math.sin(2 * math.pi * f_carrier * t) +
                    0.25 * math.sin(2 * math.pi * f_ground_L * t) +
                    0.15 * math.sin(2 * math.pi * f_mid_plane * t) +
                    0.15 * math.sin(2 * math.pi * f_top_plane * t)
                )
                sample = max(-1.0, min(1.0, sig * gate_gain * env))
                audio_samples.append(int(sample * 32767))

            self.manifest.append({
                "step": step,
                "role": role,
                "rotation_deg": self.rotation_deg,
                "compression": self.compression,
                "carrier_hz": round(f_carrier, 2),
                "ground_L_hz": round(f_ground_L, 2),
                "mid_plane_hz": round(f_mid_plane, 2),
                "top_plane_hz": round(f_top_plane, 2)
            })

        with wave.open(str(wav_path), "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(struct.pack(f"<{len(audio_samples)}h", *audio_samples))

        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "base_freq_hz": self.base_freq,
                "tempo_bpm": round(self.beat_hz * 60, 2),
                "steps": self.manifest
            }, jf, indent=2)

        print(f"[OK] WAV saved: {wav_path}")
        print(f"[OK] Manifest saved: {json_path}")

if __name__ == "__main__":
    ArohaVerifiedEngine().run_15_step_fold()