import subprocess
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

def configure_funnel():
    logging.info("Configuring Tailscale Funnel for port 8002...")
    try:
        # Enable Tailscale Serve/Funnel on port 8002
        subprocess.run(["tailscale", "serve", "--bg", "https://localhost:8002"], check=True)
        subprocess.run(["tailscale", "funnel", "8002", "on"], check=True)
        logging.info("Tailscale Funnel successfully activated on public HTTPS endpoint pointing to port 8002.")
        
        # Output current funnel status
        status = subprocess.run(["tailscale", "funnel", "status"], capture_output=True, text=True)
        print(status.stdout)
    except Exception as e:
        logging.error(f"Failed to configure Tailscale Funnel: {e}")
        logging.info("Ensure Tailscale HTTPS certificates and Funnel are enabled in your admin console.")

if __name__ == "__main__":
    configure_funnel()
