import math
import json
import wave
import struct
import random
from pathlib import Path
from datetime import datetime

class ArohaPhoneticIonEngine:
    def __init__(self, base_freq=33.0, sample_rate=44100):
        self.base_freq = base_freq
        self.sample_rate = sample_rate
        self.beat_hz = base_freq / 16.0
        self.step_dur = 1.0 / self.beat_hz
        self.root_dir = Path(__file__).resolve().parent.parent
        self.manifest = []

    def run_matrix(self):
        wav_path = self.root_dir / "audio" / "aroha_phonetic_ion_33hz.wav"
        json_path = self.root_dir / "manifests" / "aroha_phonetic_ion_manifest.json"
        samples = []
        random.seed(33)

        for step in range(1, 16):
            ph = step - 1
            mirror_offset = ph - 7

            if step <= 5:
                zone, phoneme, ion_state = "ZONE_1_K_PLOSIVE_STOP", "K (/k/ Stop -> K-OLE / K-NOT)", "H+ INWARD_CHARGE"
            elif step <= 10:
                zone = "ZONE_2_H_MIRROR_ION"
                phoneme = "H / ION (I+O+N Equilibrium)" if step == 8 else "WH = PH ([phi] Bilabial)"
                ion_state = "K+ <-> H+ MIRROR_BALANCE"
            else:
                zone, phoneme, ion_state = "ZONE_3_F_FRICATIVE_WAVE", "PH -> F (/f/ Continuous Wave)", "K+ INTRACELLULAR_CORE"

            k_ion_ratio = round(0.50 + (mirror_offset / 14.0) * 0.40, 3)
            f_root = self.base_freq
            f_h_bridge = (self.base_freq / 3.0) * 2.0
            f_k_vector = self.base_freq * 2.0 * k_ion_ratio
            f_f_fricative = self.base_freq * 3.0

            num_samples = int(self.step_dur * self.sample_rate)
            for n in range(num_samples):
                t = n / self.sample_rate
                progress = n / num_samples
                k_click = math.exp(-progress * 35.0) * 0.6 if step <= 5 else math.exp(-progress * 12.0) * 0.2
                breath_amp = 0.08 if step > 5 else 0.02
                fricative_breath = (random.uniform(-1.0, 1.0) * breath_amp) * math.sin(2 * math.pi * f_f_fricative * t)
                env = math.sin(math.pi * progress)
                core_wave = (
                    0.45 * math.sin(2 * math.pi * f_root * t) +
                    0.25 * math.sin(2 * math.pi * f_h_bridge * t) +
                    0.20 * math.sin(2 * math.pi * f_k_vector * t)
                )
                sig = (core_wave * env) + (k_click * math.sin(2 * math.pi * 132.0 * t)) + fricative_breath
                samples.append(int(max(-1.0, min(1.0, sig)) * 32767))

            self.manifest.append({
                "step": step,
                "pH": ph,
                "mirror_offset": mirror_offset,
                "zone": zone,
                "phoneme_mechanics": phoneme,
                "ion_state": ion_state,
                "k_ion_potential": k_ion_ratio
            })

        with wave.open(str(wav_path), "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(struct.pack(f"<{len(samples)}h", *samples))

        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "system": "AROHA Phonetic-Ionic Matrix (I-O-N / pH / WH-PH-F / K)",
                "steps": self.manifest
            }, jf, indent=2)

        print(f"[OK] WAV saved: {wav_path}")
        print(f"[OK] Manifest saved: {json_path}")

if __name__ == "__main__":
    ArohaPhoneticIonEngine().run_matrix()