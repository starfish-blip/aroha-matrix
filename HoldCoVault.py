import json
import logging
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class HoldCoVault:
    def __init__(self, vault_file: str = "vault_manifest.json", audit_log: str = "aroha_audit_trail.json"):
        self.vault_file = vault_file
        self.audit_log = audit_log
        self.initialize_manifest()

    def initialize_manifest(self):
        if not os.path.exists(self.vault_file):
            manifest = {
                "vault_metadata": {
                    "entity_name": "AROHA HoldCo Vault",
                    "custodian_model": "Kaitiaki Immutable Trust",
                    "governance": "Natural Law & Zero-Debt Protocol"
                },
                "protected_assets": {
                    "domains": ["starmaps13.com"],
                    "repositories": [
                        "aroha-matrix",
                        "AROHA-Core",
                        "aroha-suite",
                        "aroha-system",
                        "Consolidated-Master-Hub-for-all-AROHA-applications"
                    ]
                },
                "status": "SEALED_AND_PROTECTED"
            }
            with open(self.vault_file, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=4)
            logging.info(f"Initialized immutable HoldCo manifest: {self.vault_file}")

    def record_audit_event(self, approved: bool, reason: str, royalty_released: float):
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "PASSED" if approved else "FAILED_LOCKDOWN",
            "reason": reason,
            "royalty_released": royalty_released if approved else 0.0
        }
        
        trail = []
        if os.path.exists(self.audit_log):
            try:
                with open(self.audit_log, "r", encoding="utf-8") as f:
                    trail = json.load(f)
            except Exception:
                trail = []

        trail.append(event)
        with open(self.audit_log, "w", encoding="utf-8") as f:
            json.dump(trail, f, indent=4)
        logging.info(f"Audit event recorded to {self.audit_log}")

if __name__ == "__main__":
    vault = HoldCoVault()
    vault.record_audit_event(approved=True, reason="Chaldean Compound 35 Zero-Debt Verification Passed", royalty_released=5000.0)
