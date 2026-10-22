function onMIDISuccess(midiAccess) {
    console.log("[MIDI] MIDI Access Granted");
    const inputs = midiAccess.inputs.values();
    for (let input of inputs) {
        console.log(`[MIDI] Connected Input: ${input.name}`);
        input.onmidimessage = handleMIDIMessage;
    }
    midiAccess.onstatechange = (e) => {
        console.log(`[MIDI] State Change: ${e.port.name} - ${e.port.state}`);
    };
}

function onMIDIFailure(msg) {
    console.warn("[MIDI] Failed to get MIDI access - ", msg);
}

function handleMIDIMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;
    let note = data1;
    const velocity = data2;

    // Apply Harmonic Scale Quantization if active
    if (window.scaleEngine) {
        note = window.scaleEngine.quantizeNote(note);
    }

    // Apply Octave Shift if defined
    if (typeof currentOctaveShift !== 'undefined') {
        note += (currentOctaveShift * 12);
    }

    // Note On (command 9)
    if (command === 9 && velocity > 0) {
        if (note === 36) {
            const panicBtn = document.getElementById('panic-btn');
            if (panicBtn) panicBtn.click();
            return;
        } else if (note === 38) {
            const binBtn = document.getElementById('toggle-binaural');
            if (binBtn) binBtn.click();
            return;
        }

        if (window.arpeggiatorEngine) {
            window.arpeggiatorEngine.addNote(note);
        }

        const frequency = 440 * Math.pow(2, (note - 69) / 12);
        if (window.acousticEngine && typeof window.acousticEngine.playTone === 'function') {
            window.acousticEngine.playTone(frequency);
        }
        
        if (window.cymaticEngine) {
            window.cymaticEngine.setFrequency(frequency);
            const freqDisplay = document.getElementById('freq-display');
            if (freqDisplay) freqDisplay.innerText = `${frequency.toFixed(2)} Hz`;
        }

        if (window.arohaVisualizer && typeof window.arohaVisualizer.setFrequency === 'function') {
            window.arohaVisualizer.setFrequency(frequency);
        }
    }
    // Note Off
    else if (command === 8 || (command === 9 && velocity === 0)) {
        if (window.arpeggiatorEngine) {
            window.arpeggiatorEngine.removeNote(note);
        }
    }
    
    // Control Change (command 11) - M-Audio Oxygen 61 physical sliders send CC 13 - 24
    else if (command === 11) {
        const ccNum = data1;
        const val = data2; 

        let faderIdx = -1;
        if (ccNum >= 13 && ccNum <= 24) {
            faderIdx = ccNum - 13;
        } else if (ccNum >= 70 && ccNum <= 81) {
            faderIdx = ccNum - 70;
        } else if (ccNum >= 0 && ccNum <= 11) {
            faderIdx = ccNum;
        }

        if (faderIdx !== -1) {
            const minDb = -40;
            const maxDb = 6;
            const dbVal = minDb + (val / 127) * (maxDb - minDb);

            const slider = document.querySelector(`input[data-fader="${faderIdx}"]`);
            if (slider) slider.value = dbVal;

            if (window.acousticEngine && typeof window.acousticEngine.setFaderGain === 'function') {
                window.acousticEngine.setFaderGain(faderIdx, dbVal);
            }

            if (window.acousticEngine && window.acousticEngine.config && window.acousticEngine.config.fader_bank) {
                const freq = window.acousticEngine.config.fader_bank[faderIdx].frequency;
                if (window.cymaticEngine) {
                    window.cymaticEngine.setFrequency(freq);
                    const freqDisplay = document.getElementById('freq-display');
                    if (freqDisplay) freqDisplay.innerText = `${freq.toFixed(2)} Hz`;
                }
                if (window.arohaVisualizer && typeof window.arohaVisualizer.setFrequency === 'function') {
                    window.arohaVisualizer.setFrequency(freq);
                }
            }
        }
    }
}