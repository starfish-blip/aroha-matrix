import time
import logging
import json
import os
import urllib.request
import urllib.error
from dataclasses import dataclass
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

@dataclass
class OpCoState:
    cash_liquidity: float
    monthly_fixed_burn: float
    pending_royalty: float
    active_litigation: bool
    tailscale_connected: bool
    total_debt: float

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

class TransitionEngine:
    def __init__(self, min_burn_months: float = 12.0, ollama_model: str = "qwen2.5-coder:1.5b"):
        self.min_burn_months = min_burn_months
        self.ollama_model = ollama_model
        self.ollama_url = "http://localhost:11434/api/generate"
        self.system_locked = False
        self.vault = HoldCoVault()

    def observe(self) -> OpCoState:
        return OpCoState(
            cash_liquidity=50000.0,
            monthly_fixed_burn=3500.0,
            pending_royalty=5000.0,
            active_litigation=False,
            tailscale_connected=True,
            total_debt=0.0
        )

    def query_local_ollama(self, state: OpCoState) -> tuple[bool, str]:
        runway = state.cash_liquidity / state.monthly_fixed_burn
        json_template = '{"approved": true, "reason": "string"}'
        prompt = (
            f"Act as a strict financial auditor governed by Chaldean Compound 35 principles. "
            f"OpCo State: Cash Liquidity=${state.cash_liquidity}, Monthly Burn=${state.monthly_fixed_burn}, "
            f"Runway Months={runway:.1f}, Total Debt=${state.total_debt}, "
            f"Tailscale Connected={state.tailscale_connected}, Active Litigation={state.active_litigation}. "
            f"Verify zero-debt compliance, minimum burn runway, and safe operational parameters. "
            f"Reply with ONLY valid JSON matching this format: {json_template}"
        )
        payload = json.dumps({
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }).encode("utf-8")
        req = urllib.request.Request(self.ollama_url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                result = json.loads(response.read().decode("utf-8"))
                output = json.loads(result.get("response", '{"approved": false, "reason": "Malformed output"}'))
                reason = output.get("reason", "Ollama evaluation complete")
                approved = output.get("approved", False)
                logging.info(f"Ollama Audit Evaluation: {reason}")
                return approved, reason
        except Exception as e:
            logging.warning(f"Ollama fallback triggered: {e}")
            approved = state.total_debt == 0.0 and runway >= self.min_burn_months and not state.active_litigation
            reason = f"Fallback verification passed (Runway: {runway:.1f} months, Zero Debt)" if approved else "Fallback verification failed"
            return approved, reason

    def compare(self, state: OpCoState) -> tuple[bool, str]:
        if state.total_debt > 0.0:
            reason = "Debt threshold violated! Zero-debt policy breached."
            logging.critical(reason)
            return False, reason
        if not state.tailscale_connected:
            reason = "Tailscale mesh network disconnected!"
            logging.warning(reason)
            return False, reason
        if state.active_litigation:
            reason = "Litigation flag triggered."
            logging.critical(reason)
            return False, reason
        return self.query_local_ollama(state)

    def tiki_tilt(self, state: OpCoState, approved: bool, reason: str):
        if approved and not self.system_locked:
            logging.info(f"Compound 35 Audit PASSED. Releasing asset flow of ${state.pending_royalty:,.2f}.")
            self.vault.record_audit_event(approved=True, reason=reason, royalty_released=state.pending_royalty)
        else:
            self.system_locked = True
            logging.critical("Compound 35 Audit FAILED. TRIPPING KILL SWITCH!")
            self.vault.record_audit_event(approved=False, reason=reason, royalty_released=0.0)

    def run_audit_loop(self, interval_seconds: int = 10):
        logging.info(f"Starting Zero-Debt TransitionEngine ({self.ollama_model})...")
        try:
            while not self.system_locked:
                state = self.observe()
                is_valid, reason = self.compare(state)
                self.tiki_tilt(state, is_valid, reason)
                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            logging.info("TransitionEngine manually paused by operator.")

if __name__ == "__main__":
    engine = TransitionEngine()
    engine.run_audit_loop()
