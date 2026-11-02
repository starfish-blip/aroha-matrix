import json
import os
import logging
import urllib.request
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class DomainSentinel:
    def __init__(self, target_domain: str = "https://starmaps13.com", audit_log: str = "aroha_audit_trail.json"):
        self.target_domain = target_domain
        self.audit_log = audit_log

    def check_domain_status(self) -> dict:
        result = {"domain": self.target_domain, "status_code": None, "reachable": False, "timestamp": datetime.now().isoformat()}
        try:
            req = urllib.request.Request(self.target_domain, headers={'User-Agent': 'AROHA-DomainSentinel/2.3'})
            with urllib.request.urlopen(req, timeout=5) as response:
                result["status_code"] = response.getcode()
                result["reachable"] = response.getcode() == 200
        except Exception as e:
            result["error"] = str(e)
            result["reachable"] = False
        return result

    def audit_and_report(self):
        status = self.check_domain_status()
        logging.info(f"DomainSentinel Audit: {json.dumps(status, indent=2)}")
        
        # Save sentinel record
        sentinel_record = "domain_sentinel_status.json"
        with open(sentinel_record, "w", encoding="utf-8") as f:
            json.dump(status, f, indent=4)

if __name__ == "__main__":
    sentinel = DomainSentinel()
    sentinel.audit_and_report()
