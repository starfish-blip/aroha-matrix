import subprocess
import sys
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

def run_service(script_name):
    return subprocess.Popen([sys.executable, script_name])

def verify_and_start_funnel():
    logging.info("Verifying Tailscale Funnel proxy state...")
    try:
        # Ensure Tailscale Serve and Funnel are active on port 8002
        subprocess.run(["tailscale", "serve", "--bg", "https://localhost:8002"], check=True)
        subprocess.run(["tailscale", "funnel", "8002", "on"], check=True)
        logging.info("Tailscale Funnel proxy state verified and active on port 8002.")
    except Exception as e:
        logging.warning(f"Tailscale Funnel initialization warning: {e}. Ensure Tailscale is running and logged in.")

if __name__ == "__main__":
    logging.info("Starting AROHA Sovereign HoldCo Stack (Complete Mesh & Funnel Integration)...")
    
    # Run initial boot diagnostics, snapshots, sentinels, mesh audits, and funnel setup
    try:
        subprocess.run([sys.executable, "ArchiveEngine.py"], check=True)
        subprocess.run([sys.executable, "DomainSentinel.py"], check=True)
        subprocess.run([sys.executable, "EnforcementDaemon.py"], check=True)
        subprocess.run([sys.executable, "MeshMonitor.py"], check=True)
        verify_and_start_funnel()
    except Exception as e:
        logging.warning(f"Boot initialization warning: {e}")

    engines = []
    try:
        engines.append(run_service("TransitionEngine.py"))
        engines.append(run_service("MeshMonitor.py"))
        engines.append(run_service("dashboard.py"))
        
        logging.info("AROHA Matrix fully active. Dashboard live at http://127.0.0.1:8002 & via Tailscale Funnel")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Shutting down AROHA Stack...")
        for p in engines:
            p.terminate()
        logging.info("All sovereign nodes safely offline.")
