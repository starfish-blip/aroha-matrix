import json
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class VersionComparator:
    def __init__(self, vault_file: str = "vault_manifest.json", audit_log: str = "aroha_audit_trail.json"):
        self.vault_file = vault_file
        self.audit_log = audit_log

    def extract_metrics(self) -> dict:
        data = {"vault": {}, "recent_audits": []}
        if os.path.exists(self.vault_file):
            with open(self.vault_file, "r", encoding="utf-8") as f:
                data["vault"] = json.load(f)
        if os.path.exists(self.audit_log):
            with open(self.audit_log, "r", encoding="utf-8") as f:
                data["recent_audits"] = json.load(f)[-3:]
        return data

if __name__ == "__main__":
    vc = VersionComparator()
    print(json.dumps(vc.extract_metrics(), indent=4))
