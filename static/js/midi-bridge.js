// Advanced AROHA WebMIDI Bridge for M-Audio Oxygen 61 Hardware Mapping
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
            console.log("[MIDI] No MIDI devices detected. Please check your Oxygen 61 connection.");
        }
    }

    handleStateChange(e) {
        console.log(`[MIDI] Device state change: ${e.port.name} (${e.port.state})`);
        this.setupInputs();
    }

    handleMidiMessage(event) {
        const [status, data1, data2] = event.data;
        const command = status >> 4;

        // Note On (command 9) with velocity > 0
        if (command === 9 && data2 > 0) {
            const freq = this.midiNoteToFreq(data1);
            console.log(`[MIDI] Note On: Note ${data1} (${freq.toFixed(2)} Hz)`);
            
            if (window.acousticEngine && window.acousticEngine.audioCtx) {
                window.acousticEngine.playTone(freq);
            }
            if (window.arohaVisualizer) {
                window.arohaVisualizer.setFrequency(freq);
            }

            // Highlight corresponding on-screen key if present
            this.highlightVisualKey(data1);
        }
        
        // Control Change (command 11) - Maps physical knobs C16 - C27 / Sliders
        else if (command === 11) {
            const normalizedVal = data2 / 127.0;
            console.log(`[MIDI] CC Controller [CC ${data1}]: Value ${data2} (${normalizedVal.toFixed(2)})`);

            // Map common Oxygen 61 knobs/sliders (CC numbers typically start around 7 or 16+)
            if (data1 === 7 || data1 === 16 || data1 === 74) {
                // Master Turbulence / Vortex Depth
                const turbulenceVal = normalizedVal * 3.0;
                const slider = document.getElementById('turbulence-slider');
                if (slider) {
                    slider.value = turbulenceVal;
                    if (window.arohaVisualizer) {
                        window.arohaVisualizer.setTurbulence(turbulenceVal);
                    }
                }
            } else if (data1 >= 17 && data1 <= 28) {
                // Map knobs C17-C28 directly to the Solfeggio Fader Bank
                const faderIndex = data1 - 17;
                const dbVal = -40.0 + (normalizedVal * 46.0); // range -40dB to +6dB
                if (window.acousticEngine && window.acousticEngine.setFaderGain) {
                    window.acousticEngine.setFaderGain(faderIndex, dbVal);
                }
                // Update UI slider if rendered
                const faderInput = document.querySelector(`input[data-fader="${faderIndex}"]`);
                if (faderInput) {
                    faderInput.value = dbVal;
                }
            }
        }
    }

    highlightVisualKey(noteNumber) {
        // Find key element by note attribute or mapping
        const keys = document.querySelectorAll('.piano-key');
        keys.forEach(k => {
            if (k.getAttribute('data-note') == noteNumber) {
                k.classList.add('active');
                setTimeout(() => k.classList.remove('active'), 300);
            }
        });
    }

    midiNoteToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

window.midiBridge = new MidiBridge();
window.addEventListener('load', () => {
    setTimeout(() => {
        window.midiBridge.init();
    }, 1000);
});
