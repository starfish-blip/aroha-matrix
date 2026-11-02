import json
import os
import math
import wave
import struct
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class BinauralSynthesizer:
    def __init__(self, audit_log: str = "aroha_audit_trail.json", output_wav: str = "binaural_output.wav"):
        self.audit_log = audit_log
        self.output_wav = output_wav

    def get_target_offsets(self) -> tuple:
        status = "PASSED"
        if os.path.exists(self.audit_log):
            try:
                with open(self.audit_log, "r", encoding="utf-8") as f:
                    trail = json.load(f)
                    if trail:
                        status = trail[-1].get("status", "PASSED")
            except Exception:
                pass

        if status == "PASSED":
            # Focus 12 Expanded Awareness: 200Hz carrier, 6.0Hz Theta offset
            return 200.0, 6.0, "Focus 12 (Theta - 6.0Hz)"
        else:
            # Focus 10 Deep Calibration: 150Hz carrier, 2.0Hz Delta offset
            return 150.0, 2.0, "Focus 10 (Delta - 2.0Hz)"

    def generate_sample(self, duration_sec: int = 5):
        carrier, offset, label = self.get_target_offsets()
        logging.info(f"Synthesizing Binaural Stream for state: {label} [Carrier: {carrier}Hz, Offset: {offset}Hz]")

        sample_rate = 44100
        num_samples = sample_rate * duration_sec
        left_freq = carrier - (offset / 2.0)
        right_freq = carrier + (offset / 2.0)

        with wave.open(self.output_wav, 'w') as wav_file:
            wav_file.setnchannels(2) # Stereo (Left / Right ears)
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(sample_rate)

            for i in range(num_samples):
                t = i / float(sample_rate)
                # Generate sine waves for left and right channels
                left_val = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * left_freq * t))
                right_val = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * right_freq * t))
                
                # Pack audio frames (16-bit signed integers)
                wav_file.writeframes(struct.pack('<hh', left_val, right_val))

        logging.info(f"Binaural sample successfully written to {self.output_wav}")

if __name__ == "__main__":
    synth = BinauralSynthesizer()
    synth.generate_sample(duration_sec=3)
