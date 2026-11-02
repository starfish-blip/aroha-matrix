import json
import subprocess
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class MeshMonitor:
    def __init__(self, output_json: str = "mesh_monitor_status.json"):
        self.output_json = output_json

    def audit_mesh_latency(self) -> dict:
        nodes = []
        try:
            result = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            
            self_node = data.get("Self", {})
            nodes.append({
                "hostname": self_node.get("HostName"),
                "ip": self_node.get("TailscaleIPs", [""])[0],
                "role": "Local Host",
                "latency_ms": 0.0,
                "online": True
            })

            peers = data.get("Peer", {})
            for peer_id, peer_info in peers.items():
                hostname = peer_info.get("HostName")
                ips = peer_info.get("TailscaleIPs", [""])
                online = peer_info.get("Online", False)
                
                # Simple ping check to peer IP if online
                latency = -1.0
                if online and ips:
                    target_ip = ips[0]
                    ping_res = subprocess.run(["ping", "-n", "1", "-w", "500", target_ip], capture_output=True, text=True)
                    if ping_res.returncode == 0:
                        for line in ping_res.stdout.split("\n"):
                            if "time=" in line or "time<" in line:
                                parts = line.split("time=")
                                if len(parts) > 1:
                                    lat_str = parts[1].split("ms")[0].strip()
                                    try:
                                        latency = float(lat_str)
                                    except ValueError:
                                        pass

                nodes.append({
                    "hostname": hostname,
                    "ip": ips[0] if ips else "",
                    "role": "Peer Node",
                    "latency_ms": latency,
                    "online": online
                })
        except Exception as e:
            logging.error(f"MeshMonitor error evaluating Tailscale status: {e}")

        report = {
            "timestamp": datetime.now().isoformat(),
            "nodes": nodes
        }
        
        with open(self.output_json, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=4)

        logging.info(f"MeshMonitor report generated with {len(nodes)} nodes.")
        return report

if __name__ == "__main__":
    monitor = MeshMonitor()
    monitor.audit_mesh_latency()
