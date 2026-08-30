/**
 * audio-synth.js
 * Multi-Harmonic Web Audio API Acoustic Engine
 */

class ArohaAudioSynth {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.fundamentalOsc = null;
    this.fundamentalGain = null;
    this.harmonicOscs = [];
    this.harmonicGains = [];
    this.isPlaying = false;

    this.state = {
      fundamentalHz: 276.8136,
      harmonics: [553.6259, 830.4403, 1107.2538],
      amplitude: 0.2555,
      phaseOffsetRad: 3.6202
    };
  }

  init() {
    if (this.audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);
  }

  async start() {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    if (this.isPlaying) return;

    const now = this.audioCtx.currentTime;

    // Fundamental Tone (276.81 Hz)
    this.fundamentalOsc = this.audioCtx.createOscillator();
    this.fundamentalGain = this.audioCtx.createGain();
    this.fundamentalOsc.type = 'sine';
    this.fundamentalOsc.frequency.setValueAtTime(this.state.fundamentalHz, now);
    this.fundamentalGain.gain.setValueAtTime(this.state.amplitude * 0.4, now);

    this.fundamentalOsc.connect(this.fundamentalGain);
    this.fundamentalGain.connect(this.masterGain);
    this.fundamentalOsc.start(now);

    // Harmonic Overtones Array
    this.harmonicOscs = [];
    this.harmonicGains = [];

    this.state.harmonics.forEach((freq, index) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const weight = (1 / (index + 2)) * this.state.amplitude * 0.25;
      gain.gain.setValueAtTime(weight, now);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);

      this.harmonicOscs.push(osc);
      this.harmonicGains.push(gain);
    });

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.8, now + 0.08);
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.08);

    setTimeout(() => {
      if (this.fundamentalOsc) {
        this.fundamentalOsc.stop();
        this.fundamentalOsc.disconnect();
      }
      this.harmonicOscs.forEach(osc => {
        osc.stop();
        osc.disconnect();
      });
      this.harmonicOscs = [];
      this.harmonicGains = [];
      this.isPlaying = false;
    }, 100);
  }

  updateFromTelemetry(payload) {
    if (!payload || !payload.resonance) return;

    const res = payload.resonance;
    this.state.fundamentalHz = res.fundamental_hz || this.state.fundamentalHz;
    this.state.harmonics = res.harmonics || this.state.harmonics;
    this.state.amplitude = res.amplitude !== undefined ? res.amplitude : this.state.amplitude;
    this.state.phaseOffsetRad = res.phase_offset_rad || this.state.phaseOffsetRad;

    if (!this.isPlaying || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const rampTarget = now + 0.05;

    // Apply slight micro-detuning based on phase lag rad
    const phaseDetuning = (this.state.phaseOffsetRad / (2 * Math.PI)) * 2;

    if (this.fundamentalOsc) {
      this.fundamentalOsc.frequency.linearRampToValueAtTime(this.state.fundamentalHz + phaseDetuning, rampTarget);
      this.fundamentalGain.gain.linearRampToValueAtTime(this.state.amplitude * 0.4, rampTarget);
    }

    this.harmonicOscs.forEach((osc, idx) => {
      if (this.state.harmonics[idx]) {
        osc.frequency.linearRampToValueAtTime(this.state.harmonics[idx] + (phaseDetuning * (idx + 2)), rampTarget);
        const weight = (1 / (idx + 2)) * this.state.amplitude * 0.25;
        this.harmonicGains[idx].gain.linearRampToValueAtTime(weight, rampTarget);
      }
    });
  }
}

// Assign to global window object
window.arohaSynth = new ArohaAudioSynth();
