const MORSE_TABLE = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
  F: '..-.',  G: '--.',   H: '....',  I: '..',    J: '.---',
  K: '-.-',   L: '.-..',  M: '--',    N: '-.',    O: '---',
  P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',  Y: '-.--',
  Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '/': '-..-.', '-': '-....-', '.': '.-.-.-',
};

export function encodeMorse(text) {
  return String(text || '')
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_TABLE[ch] || '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}

export class PortalBinauralEngine {
  constructor(stateEndpoint = '/api/v1/portal/state', options = {}) {
    this.stateEndpoint = stateEndpoint;
    this.ctx = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.leftPan = null;
    this.rightPan = null;
    this.morseOsc = null;
    this.morsePan = null;
    this.morseGain = null;
    this.masterGain = null;
    this.analyser = null;

    this.isRunning = false;
    this.lastState = null;

    // Phase 2 Morse beacon state
    this.morseEnabled = options.morseEnabled ?? true;
    this.morseLoop = options.morseLoop ?? true;
    this.morsePeakGain = options.morsePeakGain ?? 0.28;
    this.onMorseEvent = options.onMorseEvent || (() => {});
    this._morseLoopTimer = null;
    this._morseStepTimers = [];
    this._activeMorseCipher = null;
  }

  async fetchPortalState() {
    const res = await fetch(this.stateEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Portal state HTTP ${res.status}`);
    }
    const data = await res.json();
    this.lastState = data;
    return data;
  }

  computeChannels(resonance) {
    const carrier = Number(resonance?.carrier_hz ?? 136.1);
    const offset = Number(resonance?.binaural_offset_hz ?? 4.0);
    return {
      carrierHz: carrier,
      offsetHz: offset,
      leftHz: Number((carrier - offset / 2).toFixed(3)),
      rightHz: Number((carrier + offset / 2).toFixed(3)),
      morseHz: Number((carrier * 3).toFixed(2)), // 3rd harmonic overtone (408.3 Hz)
      focusState: resonance?.focus_state ?? 12,
      chladniMode: resonance?.chladni_mode ?? [5, 7],
    };
  }

  _ensureAudioGraph() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Dichotic left/right entrainment oscillators
    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.rightOsc.type = 'sine';

    this.leftPan = new StereoPannerNode(this.ctx, { pan: -1 });
    this.rightPan = new StereoPannerNode(this.ctx, { pan: 1 });

    // Center-panned 3rd-harmonic Phase 2 Morse beacon oscillator
    this.morseOsc = this.ctx.createOscillator();
    this.morseOsc.type = 'sine';
    this.morsePan = new StereoPannerNode(this.ctx, { pan: 0 });
    this.morseGain = this.ctx.createGain();
    this.morseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.leftOsc.connect(this.leftPan).connect(this.masterGain);
    this.rightOsc.connect(this.rightPan).connect(this.masterGain);
    this.morseOsc.connect(this.morsePan).connect(this.morseGain).connect(this.masterGain);
    this.masterGain.connect(this.analyser).connect(this.ctx.destination);

    this.leftOsc.start();
    this.rightOsc.start();
    this.morseOsc.start();
  }

  async startFromPortal(targetGain = 0.22) {
    const state = await this.fetchPortalState();
    if (state.status !== 'unlocked' || state.token !== 'aroha-33-verified') {
      throw new Error(`Portal locked (status=${state.status}). Unlock 33-vertebrae gate first.`);
    }

    const tuning = this.computeChannels(state.resonance);
    this._ensureAudioGraph();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.leftOsc.frequency.setTargetAtTime(tuning.leftHz, now, 0.03);
    this.rightOsc.frequency.setTargetAtTime(tuning.rightHz, now, 0.03);
    this.morseOsc.frequency.setTargetAtTime(tuning.morseHz, now, 0.03);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.06);

    this.isRunning = true;

    if (this.morseEnabled && state.phase2_hint?.plaintext) {
      this.playMorseHint(state.phase2_hint);
    }

    return { state, tuning };
  }

  async syncLive() {
    const state = await this.fetchPortalState();
    const tuning = this.computeChannels(state.resonance);

    if (!this.isRunning || !this.ctx || state.status !== 'unlocked') {
      return { state, tuning };
    }

    const now = this.ctx.currentTime;
    this.leftOsc.frequency.setTargetAtTime(tuning.leftHz, now, 0.04);
    this.rightOsc.frequency.setTargetAtTime(tuning.rightHz, now, 0.04);
    this.morseOsc.frequency.setTargetAtTime(tuning.morseHz, now, 0.04);

    const nextCipher = state.phase2_hint?.cipher_id || state.phase2_hint?.plaintext || null;
    if (this.morseEnabled && state.token === 'aroha-33-verified' && nextCipher && nextCipher !== this._activeMorseCipher) {
      this.playMorseHint(state.phase2_hint);
    }

    return { state, tuning };
  }

  stopMorseHint() {
    clearTimeout(this._morseLoopTimer);
    this._morseLoopTimer = null;
    while (this._morseStepTimers.length > 0) {
      clearTimeout(this._morseStepTimers.pop());
    }
    if (this.ctx && this.morseGain) {
      const now = this.ctx.currentTime;
      this.morseGain.gain.cancelScheduledValues(now);
      this.morseGain.gain.setTargetAtTime(0.0001, now, 0.008);
    }
    this.onMorseEvent({ type: 'morse_stopped' });
  }

  playMorseHint(hintInput = null, options = {}) {
    const state = this.lastState || {};
    if (state.status !== 'unlocked' || state.token !== 'aroha-33-verified') {
      throw new Error('Phase 2 Morse beacon requires verified token aroha-33-verified.');
    }
    if (!this.ctx || !this.morseGain) {
      throw new Error('AudioContext not started yet. Call startFromPortal() from a user gesture first.');
    }

    const hintObj = typeof hintInput === 'string'
      ? { cipher_id: 'CUSTOM', plaintext: hintInput, wpm: options.wpm || 14, harmonic_multiplier: 3 }
      : (hintInput || state.phase2_hint);

    if (!hintObj?.plaintext) return null;

    this.stopMorseHint();
    this._activeMorseCipher = hintObj.cipher_id || hintObj.plaintext;

    const plaintext = String(hintObj.plaintext).toUpperCase();
    const encoded = encodeMorse(plaintext);
    const wpm = Number(options.wpm || hintObj.wpm || 14);
    const unitSec = 1.2 / wpm; // PARIS standard (~0.0857s at 14 WPM)
    const rampTau = 0.006;     // 6ms click-free exponential envelope

    const tuning = this.computeChannels(state.resonance);
    const mult = Number(options.harmonicMultiplier || hintObj.harmonic_multiplier || 3);
    const beaconHz = Number((tuning.carrierHz * mult).toFixed(2));

    const startAt = this.ctx.currentTime + 0.04;
    this.morseOsc.frequency.setTargetAtTime(beaconHz, this.ctx.currentTime, 0.02);
    this.morseGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.morseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    let cursor = startAt;
    const words = plaintext.trim().split(/\s+/);

    words.forEach((word, wIdx) => {
      const chars = word.split('');
      chars.forEach((ch, cIdx) => {
        const pattern = MORSE_TABLE[ch];
        if (!pattern) return;

        const charOffsetMs = Math.max(0, (cursor - this.ctx.currentTime) * 1000);
        this._morseStepTimers.push(
          setTimeout(() => {
            this.onMorseEvent({
              type: 'morse_char',
              char: ch,
              pattern,
              plaintext,
              encoded,
              beaconHz,
              cipherId: hintObj.cipher_id || 'P2',
            });
          }, charOffsetMs)
        );

        for (let i = 0; i < pattern.length; i++) {
          const sym = pattern[i];
          const onUnits = sym === '-' ? 3 : 1;
          const onDur = onUnits * unitSec;

          this.morseGain.gain.setTargetAtTime(this.morsePeakGain, cursor, rampTau);
          cursor += onDur;
          this.morseGain.gain.setTargetAtTime(0.0001, cursor, rampTau);
          cursor += unitSec; // 1-unit intra-character gap
        }

        // Total inter-character gap is 3 units (1 already added after last symbol + 2 more)
        if (cIdx < chars.length - 1) {
          cursor += 2 * unitSec;
        }
      });

      // Total word gap is 7 units (1 already added + 6 more)
      if (wIdx < words.length - 1) {
        cursor += 6 * unitSec;
      }
    });

    const totalMs = Math.max(300, (cursor - this.ctx.currentTime) * 1000);
    this.onMorseEvent({
      type: 'morse_started',
      plaintext,
      encoded,
      beaconHz,
      wpm,
      cipherId: hintObj.cipher_id || 'P2',
    });

    this._morseStepTimers.push(
      setTimeout(() => {
        this.onMorseEvent({ type: 'morse_cycle_complete', plaintext, encoded });
        if (this.isRunning && this.morseEnabled && (options.loop ?? this.morseLoop)) {
          this._morseLoopTimer = setTimeout(() => {
            if (this.isRunning && this.morseEnabled) {
              this.playMorseHint(this.lastState?.phase2_hint || hintObj, options);
            }
          }, 2600);
        }
      }, totalMs)
    );

    return { plaintext, encoded, beaconHz, durationMs: Math.round(totalMs) };
  }

  stop() {
    this.stopMorseHint();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
    this.isRunning = false;
  }
}
if (!PortalBinauralEngine.prototype.applyCrownPreset) {
  const _origStop = PortalBinauralEngine.prototype.stop;
  PortalBinauralEngine.prototype.stop = function (...args) {
    if (Array.isArray(this._crownOscillators)) {
      for (const osc of this._crownOscillators) {
        try { osc.stop(); osc.disconnect(); } catch {}
      }
      this._crownOscillators = [];
    }
    if (this._crownBus) {
      try { this._crownBus.disconnect(); } catch {}
      this._crownBus = null;
    }
    this.activeCrownPreset = null;
    return _origStop.apply(this, args);
  };

  PortalBinauralEngine.prototype.applyCrownPreset = async function (crownPayload) {
    const preset = crownPayload?.synth_preset;
    if (!preset) return false;

    if (!this.isRunning && typeof this.startFromPortal === 'function') {
      await this.startFromPortal(0.22);
    }
    const audioCtx = this.ctx || this.audioCtx;
    if (!audioCtx) return false;

    if (Array.isArray(this._crownOscillators)) {
      for (const osc of this._crownOscillators) {
        try { osc.stop(); osc.disconnect(); } catch {}
      }
    }
    if (this._crownBus) {
      try { this._crownBus.disconnect(); } catch {}
    }

    const carrier = Number(preset.fundamental_carrier_hz || 136.1);
    const ratios = Array.isArray(preset.harmonic_ratios)
      ? preset.harmonic_ratios
      : [1.0, 1.5, 2.0, 3.0, 4.5, 6.0];
    const now = audioCtx.currentTime;

    const bus = audioCtx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(0.055, now + 0.35);
    bus.connect(this.analyser || this.masterGain || audioCtx.destination);

    const oscs = [];
    for (const ratio of ratios) {
      const r = Number(ratio);
      if (!Number.isFinite(r) || r <= 1.0) continue;
      const osc = audioCtx.createOscillator();
      const voiceGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(carrier * r, now);
      voiceGain.gain.setValueAtTime(0.22 / r, now);
      osc.connect(voiceGain);
      voiceGain.connect(bus);
      osc.start(now);
      oscs.push(osc);
    }

    this._crownBus = bus;
    this._crownOscillators = oscs;
    this.activeCrownPreset = preset.preset_name || 'AROHA Zenith-26 Crown Harmonic Matrix';
    return true;
  };
}
