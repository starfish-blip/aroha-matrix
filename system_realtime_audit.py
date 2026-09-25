import os
import json
from datetime import datetime

TARGET_GROUPS = {
    "Hermes Backend": ["hermes.py", "hermes_server.js"],
    "Acoustic Engine": ["audio_engine.py", "audio-synth.js"],
    "Visual Matrix": ["vector_matrix.json", "index.html"],
    "Telemetry Logs": ["telemetry.json", "artifact_log.json"]
}

def run_audit():
    print(r"==================================================")
    print(r"       [REAL-TIME BUILD STATUS] - AROHA SUITE     ")
    print(r"==================================================")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Working Directory: {os.getcwd()}\n")

    status_report = {}
    all_active = True

    for group, files in TARGET_GROUPS.items():
        print(f"[{group}]")
        group_status = {}
        for fname in files:
            exists = os.path.exists(fname)
            status_str = "ACTIVE" if exists else "NOT CREATED (Conceptual / Pending)"
            print(f"  - {fname}: {status_str}")
            group_status[fname] = exists
            if not exists:
                all_active = False
        status_report[group] = group_status
        print()

    log_data = {
        "timestamp": datetime.now().isoformat(),
        "build_status": "STABLE" if all_active else "DENSITY GAP DETECTED",
        "components": status_report
    }

    try:
        with open("telemetry.json", "w") as f:
            json.dump(log_data, f, indent=2)
        print("[Telemetry Updated: telemetry.json written successfully]")
    except Exception as e:
        print(f"[Error writing telemetry: {e}]")

    print(r"==================================================")
    if all_active:
        print("STATUS: ALL CIRCUITS PLUMB AND TRUE")
    else:
        print("STATUS: DENSITY GAP DETECTED - PENDING MODULES RECOGNIZED")
    print(r"==================================================")

if __name__ == "__main__":
    run_audit()
