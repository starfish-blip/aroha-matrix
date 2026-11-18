export class PortalBinauralEngine {
  constructor(stateEndpoint = '/api/v1/portal/state') {
    this.stateEndpoint = stateEndpoint;
    this.ctx = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.leftPan = null;
    this.rightPan = null;
    this.masterGain = null;
    this.analyser = null;
    this.isRunning = false;
    this.lastState = null;
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
      focusState: resonance?.focus_state ?? 12,
      chladniMode: resonance?.chladni_mode ?? [5, 7],
    };
  }

  async startFromPortal(targetGain = 0.22) {
    const state = await this.fetchPortalState();
    if (state.status !== 'unlocked' || state.token !== 'aroha-33-verified') {
      throw new Error(`Portal locked (status=${state.status}). Unlock 33-vertebrae gate first.`);
    }

    const tuning = this.computeChannels(state.resonance);

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.leftOsc = this.ctx.createOscillator();
      this.rightOsc = this.ctx.createOscillator();
      this.leftOsc.type = 'sine';
      this.rightOsc.type = 'sine';

      this.leftPan = new StereoPannerNode(this.ctx, { pan: -1 });
      this.rightPan = new StereoPannerNode(this.ctx, { pan: 1 });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.leftOsc.connect(this.leftPan).connect(this.masterGain);
      this.rightOsc.connect(this.rightPan).connect(this.masterGain);
      this.masterGain.connect(this.analyser).connect(this.ctx.destination);

      this.leftOsc.start();
      this.rightOsc.start();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.leftOsc.frequency.setTargetAtTime(tuning.leftHz, now, 0.03);
    this.rightOsc.frequency.setTargetAtTime(tuning.rightHz, now, 0.03);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.06);

    this.isRunning = true;
    return { state, tuning };
  }

  async syncLive() {
    const state = await this.fetchPortalState();
    if (!this.isRunning || !this.ctx || state.status !== 'unlocked') {
      return { state, tuning: this.computeChannels(state.resonance) };
    }
    const tuning = this.computeChannels(state.resonance);
    const now = this.ctx.currentTime;
    this.leftOsc.frequency.setTargetAtTime(tuning.leftHz, now, 0.04);
    this.rightOsc.frequency.setTargetAtTime(tuning.rightHz, now, 0.04);
    return { state, tuning };
  }

  stop() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
    this.isRunning = false;
  }
}