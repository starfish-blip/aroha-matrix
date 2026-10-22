// midi.js - Web MIDI API Listener and Hardware Link
import { MIDIMappingManager } from './midiMapping.js';

export function setupMIDIWithMapping(field2d, field3d, noteCallback) {
    const mappingManager = new MIDIMappingManager(field2d, field3d);

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(midiAccess => {
            console.log('MIDI Initialized Successfully');
            for (let input of midiAccess.inputs.values()) {
                console.log('Connected MIDI Device:', input.name);
                input.onmidimessage = (event) => {
                    const [status, data1, data2] = event.data;
                    const command = status >> 4;

                    // Note On message (command 9)
                    if (command === 9 && data2 > 0) {
                        const freq = 440 * Math.pow(2, (data1 - 69) / 12);
                        if (noteCallback) noteCallback(freq);
                    }
                    // Control Change message (command 11)
                    else if (command === 11) {
                        mappingManager.handleCC(data1, data2);
                    }
                };
            }
        }, err => {
            console.warn('MIDI Access Failed:', err);
        });
    } else {
        console.warn('Web MIDI API not supported in this browser.');
    }
}
