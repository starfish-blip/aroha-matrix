let midiAccess = null;

export async function initializeMIDI(chladniMaterial) {
    try {
        midiAccess = await navigator.requestMIDIAccess();
        console.log("AROHA WebMIDI Active. Waiting for hardware input...");

        for (let input of midiAccess.inputs.values()) {
            input.onmidimessage = (message) => handleMIDIMessage(message, chladniMaterial);
        }
    } catch (err) {
        console.error("MIDI access denied or unsupported by this browser.", err);
    }
}

function handleMIDIMessage(message, material) {
    const [command, control, value] = message.data;

    // Command 176 is Control Change (Sliders and Knobs)
    if (command === 176) {
        // Normalize the 0-127 MIDI value to a decimal percentage (0.0 to 1.0)
        const normalizedValue = value / 127.0;

        // Map CC 73 (Commonly Slider 1) to Chladni Mode N (Range 1-15)
        if (control === 73) {
            material.uniforms.u_modeN.value = 1.0 + (normalizedValue * 14.0);
        }
        
        // Map CC 74 (Commonly Slider 2) to Chladni Mode M (Range 1-15)
        if (control === 74) {
            material.uniforms.u_modeM.value = 1.0 + (normalizedValue * 14.0);
        }
        
        // Map CC 1 (Modulation Wheel) to Amplitude / Intensity
        if (control === 1) {
            material.uniforms.u_amplitude.value = Math.max(0.1, normalizedValue * 5.0);
        }
    }

    // Command 144 is Note On (Physical Keys)
    if (command === 144 && value > 0) {
        // Here you can map specific keys to trigger Gateway Focus levels
        // e.g., Middle C (60) snaps to Focus 12 geometry
        console.log(`Key Strike: Pitch ${control}, Velocity ${value}`);
    }
}
