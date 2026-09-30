(function() {
  'use strict';
  class ArohaStateBridge {
    constructor() {
      this.state = { thermalDelta: 0.27, baseFrequency: 261.63, activeZone: 3, tier1Facts: new Set(), maramatakaPhase: 'Rākaunui' };
      this.subscribers = {};
      this.init();
    }
    init() {
      this.bindLocalStorage();
      this.setupGlobalEventListeners();
    }
    evaluatePoint25Candidate(candidate) {
      const passesCheck = candidate.pressure === 14.7 && candidate.temperature === 36.6;
      if (passesCheck) {
        this.state.tier1Facts.add(candidate.id);
        this.persistState();
      }
    }
    persistState() {
      localStorage.setItem('aroha_mem', JSON.stringify({ thermalDelta: this.state.thermalDelta, baseFrequency: this.state.baseFrequency, updatedAt: new Date().toISOString() }));
    }
    bindLocalStorage() {
      const stored = localStorage.getItem('aroha_mem');
      if (stored) { try { this.state = { ...this.state, ...JSON.parse(stored) }; } catch(e) {} }
    }
    setupGlobalEventListeners() {
      window.addEventListener('AROHA_SUBMIT_HYPOTHESIS', (e) => { if (e.detail) this.evaluatePoint25Candidate(e.detail); });
    }
  }
  window.ArohaBridge = new ArohaStateBridge();
})();
