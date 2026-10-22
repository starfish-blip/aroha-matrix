class MidiBridge {
    constructor() {
        this.midiAccess = null;
        this.inputs = [];
        this.octaveShift = 0;
    }

    async init() {
        if (!navigator.requestMIDIAccess) return;
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupInputs();
            this.midiAccess.onstatechange = () => this.setupInputs();
        } catch (err) {
            console.error("[MIDI] Access error:", err);
        }
    }

    setupInputs() {
        for (let input of this.midiAccess.inputs.values()) {
            input.onmidimessage = (msg) => this.handleMidiMessage(msg);
        }
    }

    handleMidiMessage(event) {
        const [status, data1, data2] = event.data;
        const command = status >> 4;

        // Note On
        if (command === 9 && data2 > 0) {
            const adjustedNote = data1 + (this.octaveShift * 12);
            const freq = this.midiNoteToFreq(adjustedNote);
            
            if (window.acousticEngine && window.acousticEngine.audioCtx) {
                window.acousticEngine.playTone(freq);
            }
            if (window.arohaVisualizer) {
                window.arohaVisualizer.setFrequency(freq);
            }
        }
        // Control Change (Knobs / Sliders)
        else if (command === 11) {
            const normalized = data2 / 127.0;
            if (data1 === 7 || data1 === 74) {
                const turbulence = normalized * 3.0;
                const slider = document.getElementById('turbulence-slider');
                if (slider) {
                    slider.value = turbulence;
                    if (window.arohaVisualizer) window.arohaVisualizer.setTurbulence(turbulence);
                }
            } else if (data1 >= 17 && data1 <= 28) {
                const idx = data1 - 17;
                const db = -40.0 + (normalized * 46.0);
                if (window.acousticEngine && window.acousticEngine.setFaderGain) {
                    window.acousticEngine.setFaderGain(idx, db);
                }
            }
        }
    }

    midiNoteToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

window.midiBridge = new MidiBridge();
window.addEventListener('load', () => setTimeout(() => window.midiBridge.init(), 1000));
