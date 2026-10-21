import os
import json

def verify_matrix():
    target_dir = r"C:\Users\terry\aroha-matrix"
    files = ["src/engine/hermes.js", "taskflow/index.html"]
    audit_data = {}
    
    print("Running Sovereign Matrix Audit...")
    for f in files:
        full_path = os.path.join(target_dir, f)
        exists = os.path.exists(full_path)
        audit_data[f] = {"status": "Accepted Reality" if exists else "Missing", "path": full_path}
        print(f"[{ "RED" if exists else "MISSING" }] {f}")
        
    with open("vector_matrix.json", "w") as out:
        json.dump(audit_data, out, indent=4)
    print("Audit written to vector_matrix.json")

if __name__ == "__main__":
    verify_matrix()

