/**
 * Master Event Bridge & Acoustic Synth Engine v2.6.0
 * Includes AnalyserNode for CRT Canvas Oscilloscope
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
        tier1Facts: new Set()
      };
      
      this.audioCtx = null;
      this.analyser = null;
      this.init();
    }

    init() {
      console.log("[AROHA BRIDGE] Master System Loop Active.");
      this.bindLocalStorage();
      this.setupGlobalEventListeners();
    }

    initAudioContext() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        
        // Setup Analyser Node for CRT Waveform Rendering
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.connect(this.audioCtx.destination);
      }
    }

    playSpineFrequency(nodeIndex) {
      this.initAudioContext();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const harmonicRatio = 1 + ((nodeIndex - 1) / 33);
      const targetFrequency = (this.state.baseFreq + this.state.thermalDelta) * harmonicRatio;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = nodeIndex <= 12 ? 'sine' : (nodeIndex <= 24 ? 'triangle' : 'sawtooth');
      osc.frequency.setValueAtTime(targetFrequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1.8);

      // Route Oscillator -> Gain -> Analyser -> Speakers
      osc.connect(gain);
      gain.connect(this.analyser);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.8);

      console.log(`[SPINE AUDIO] Playing Node ${nodeIndex}/33: ${targetFrequency.toFixed(2)} Hz`);
    }

    bindLocalStorage() {
      const stored = localStorage.getItem('aroha_mem');
      if (stored) {
        try { this.state = { ...this.state, ...JSON.parse(stored) }; } catch(e) {}
      }
    }

    setupGlobalEventListeners() {
      window.addEventListener('AROHA_PLAY_SPINE_NODE', (e) => {
        if (e.detail && e.detail.nodeIndex !== undefined) {
          this.playSpineFrequency(e.detail.nodeIndex);
        }
      });
    }
  }

  window.ArohaBridge = new ArohaStateBridge();
})();
