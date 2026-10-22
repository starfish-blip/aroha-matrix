class AROHAAudioEngine {
    constructor() {
        this.audioCtx = null;
        this.masterGain = null;
        this.analyser = null;
        this.faderChannels = [];
        // Sacred Solfeggio & Harmonic frequency bank
        this.config = {
            fader_bank: [
                { frequency: 174.0 },
                { frequency: 285.0 },
                { frequency: 396.0 },
                { frequency: 417.0 },
                { frequency: 432.0 },
                { frequency: 528.0 },
                { frequency: 639.0 },
                { frequency: 741.0 },
                { frequency: 852.0 },
                { frequency: 963.0 },
                { frequency: 1111.0 },
                { frequency: 4320.0 }
            ]
        };
    }

    async init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
        if (!this.masterGain) {
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.5;

            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;

            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
        }

        if (this.faderChannels.length === 0) {
            this.faderChannels = this.config.fader_bank.map((fader, idx) => {
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(this.masterGain);

                const osc = this.audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(fader.frequency, this.audioCtx.currentTime);
                osc.connect(gainNode);
                osc.start();

                return { osc, gainNode, frequency: fader.frequency };
            });
        }

        console.log("[Audio] Engine Initialized with Sacred Solfeggio Fader Bank");
    }

    playTone(frequency) {
        if (!this.audioCtx) return;
        
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.5);
    }

    setFaderGain(idx, valDB) {
        if (this.faderChannels[idx] && this.audioCtx) {
            const linearGain = valDB <= -40 ? 0 : Math.pow(10, valDB / 20);
            this.faderChannels[idx].gainNode.gain.setTargetAtTime(linearGain, this.audioCtx.currentTime, 0.05);
        }
    }

    getAudioData(dataArray) {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(dataArray);
        }
    }
}

window.acousticEngine = new AROHAAudioEngine();