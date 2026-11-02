import json
import os
import shutil
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class ArchiveEngine:
    def __init__(self, audit_log: str = "aroha_audit_trail.json", vault_file: str = "vault_manifest.json", archive_dir: str = "audit_archives"):
        self.audit_log = audit_log
        self.vault_file = vault_file
        self.archive_dir = archive_dir

    def create_snapshot(self):
        if not os.path.exists(self.archive_dir):
            os.makedirs(self.archive_dir)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_sub = os.path.join(self.archive_dir, f"snapshot_{timestamp}")
        os.makedirs(snapshot_sub, exist_ok=True)

        backed_up = []
        if os.path.exists(self.audit_log):
            shutil.copy(self.audit_log, os.path.join(snapshot_sub, "aroha_audit_trail.json"))
            backed_up.append("aroha_audit_trail.json")

        if os.path.exists(self.vault_file):
            shutil.copy(self.vault_file, os.path.join(snapshot_sub, "vault_manifest.json"))
            backed_up.append("vault_manifest.json")

        logging.info(f"ArchiveEngine: Successfully snapshotted {backed_up} to {snapshot_sub}")

if __name__ == "__main__":
    engine = ArchiveEngine()
    engine.create_snapshot()
