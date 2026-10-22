// audioEngine.js - Advanced Web Audio Synthesizer Engine
export class AudioEngine {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.25;
        this.masterGain.connect(this.audioCtx.destination);

        this.waveform = 'sawtooth';
        this.attack = 0.05;
        this.decay = 1.0;

        window.audioCtx = this.audioCtx;
        window.masterGain = this.masterGain;
    }

    setWaveform(type) {
        this.waveform = type;
    }

    setEnvelope(attack, decay) {
        this.attack = attack;
        this.decay = decay;
    }

    playTone(frequency) {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = this.waveform;
        osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

        const now = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + this.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + this.attack + this.decay);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + this.attack + this.decay);
    }
}
