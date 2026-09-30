/**
 * Master Event Bridge & Acoustic Synth Engine v2.4.0
 * Binds Zone 1, Zone 2, and Zone 3 Telemetry Loops
 */
(function() {
  'use strict';

  class ArohaStateBridge {
    constructor() {
      this.state = {
        thermalDelta: 0.27, // ΔT = 0.27°C
        baseFreq: 261.63,    // C4 Middle C
        activeZone: 3,
        maramatakaPhase: 'Rākaunui',
        spineNodes: 33
      };
      
      this.audioCtx = null;
      this.activeOscillators = [];
      this.init();
    }

    init() {
      console.log("[AROHA BRIDGE] System initialized. Baseline locked at 36.6°C / 14.7 psi.");
      this.setupGlobalEventListeners();
    }

    initAudioContext() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
    }

    /**
     * Plays microtonally shifted 33-spine elemental node frequency
     * @param {number} nodeIndex Vertebra index (1 to 33)
     */
    playSpineFrequency(nodeIndex) {
      this.initAudioContext();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Base formula: f_node = (C4 + (nodeIndex * 0.27)) * harmonicRatio
      const harmonicRatio = 1 + ((nodeIndex - 1) / 33);
      const targetFrequency = (this.state.baseFreq + this.state.thermalDelta) * harmonicRatio;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = nodeIndex <= 12 ? 'sine' : (nodeIndex <= 24 ? 'triangle' : 'sawtooth');
      osc.frequency.setValueAtTime(targetFrequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.8);

      console.log(`[ACOUSTIC SYNTH] Node ${nodeIndex}/33 Output: ${targetFrequency.toFixed(2)} Hz (${osc.type} wave)`);
    }

    evaluatePoint25Candidate(candidate) {
      const passesCheck = candidate.pressure === 14.7 && candidate.temperature === 36.6;
      if (passesCheck) {
        console.log("%c[POINT 25] Gold Emergence (1+1=3) Validated.", "color:#ffd700; font-weight:bold;");
      } else {
        console.warn("[POINT 25] Magenta Purge Reset triggered.");
      }
    }

    setupGlobalEventListeners() {
      window.addEventListener('AROHA_PLAY_SPINE_NODE', (e) => {
        if (e.detail && e.detail.nodeIndex) {
          this.playSpineFrequency(e.detail.nodeIndex);
        }
      });
    }
  }

  window.ArohaBridge = new ArohaStateBridge();
})();
