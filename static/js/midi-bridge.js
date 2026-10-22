// AROHA WebMIDI Bridge for M-Audio Oxygen 61
class MidiBridge {
    constructor() {
        this.midiAccess = null;
        this.inputs = [];
        this.connectedDevice = null;
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("WebMIDI is not supported in this browser.");
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupInputs();
            this.midiAccess.onstatechange = (e) => this.handleStateChange(e);
            console.log("[MIDI] WebMIDI Initialized Successfully");
        } catch (err) {
            console.error("[MIDI] Failed to get MIDI access:", err);
        }
    }

    setupInputs() {
        this.inputs = [];
        let found = false;
        for (let input of this.midiAccess.inputs.values()) {
            this.inputs.push(input);
            input.onmidimessage = (msg) => this.handleMidiMessage(msg);
            console.log(`[MIDI] Connected Input: ${input.name}`);
            this.connectedDevice = input.name;
            found = true;
        }
        if (!found) {
            console.log("[MIDI] No MIDI devices detected. Please connect your Oxygen 61.");
        }
    }

    handleStateChange(e) {
        console.log(`[MIDI] Device state change: ${e.port.name} (${e.port.state})`);
        this.setupInputs();
    }

    handleMidiMessage(event) {
        const [status, data1, data2] = event.data;
        const command = status >> 4;
        const channel = status & 0xf;

        // Note On (command 9) with velocity > 0
        if (command === 9 && data2 > 0) {
            const freq = this.midiNoteToFreq(data1);
            console.log(`[MIDI] Note On: Note ${data1} (${freq.toFixed(2)} Hz) Vel ${data2}`);
            
            if (window.acousticEngine && window.acousticEngine.audioCtx) {
                window.acousticEngine.playTone(freq);
            }
            if (window.arohaVisualizer) {
                window.arohaVisualizer.setFrequency(freq);
            }
        }
        
        // Control Change (command 11) - Maps physical knobs/sliders
        else if (command === 11) {
            console.log(`[MIDI] CC Controller ${data1}: Value ${data2}`);
            
            // Map CC 7 (Volume / Slider) or common knob controllers to turbulence or master gain
            if (data1 === 7 || data1 === 74) {
                const normalizedVal = data2 / 127.0 * 3.0; // scale 0 to 3.0
                const slider = document.getElementById('turbulence-slider');
                if (slider) {
                    slider.value = normalizedVal;
                    if (window.arohaVisualizer) {
                        window.arohaVisualizer.setTurbulence(normalizedVal);
                    }
                }
            }
        }
    }

    midiNoteToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

window.midiBridge = new MidiBridge();

// Auto-initialize MIDI when window loads or audio engine starts
window.addEventListener('load', () => {
    setTimeout(() => {
        window.midiBridge.init();
    }, 1000);
});
