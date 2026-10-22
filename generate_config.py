import json
import os
import math

base = 432
fader_bank = [
    {
        "fader_index": i + 1,
        "frequency": round(base * math.pow(2, (i - 6) / 12), 2),
        "default_gain_db": 0.0
    }
    for i in range(12)
]

config_payload = {
    "base_frequency": base,
    "waveform": "sine",
    "fader_bank": fader_bank
}

os.makedirs("static/config", exist_ok=True)
with open("static/config/acoustic_config.json", "w") as f:
    json.dump(config_payload, f, indent=2)

print("[SUCCESS] acoustic_config.json generated and saved!")