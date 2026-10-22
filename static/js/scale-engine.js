class AROHAScaleEngine {
    constructor() {
        // Pentatonic / Solfeggio scale intervals relative to root
        this.scales = {
            pentatonic: [0, 2, 4, 7, 9],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            solfeggio: [0, 2, 4, 5, 7, 9, 11] // Major diatonic scale representation
        };
        this.currentScale = 'pentatonic';
        this.rootNote = 60; // Middle C (C4)
    }

    quantizeNote(midiNote) {
        const scaleIntervals = this.scales[this.currentScale] || this.scales.pentatonic;
        const octave = Math.floor(midiNote / 12);
        const noteInOctave = midiNote % 12;

        // Find the closest note in the scale
        let closest = scaleIntervals[0];
        let minDiff = Math.abs(noteInOctave - closest);

        for (let i = 1; i < scaleIntervals.length; i++) {
            const diff = Math.abs(noteInOctave - scaleIntervals[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = scaleIntervals[i];
            }
        }

        const quantizedNote = (octave * 12) + closest;
        return quantizedNote;
    }

    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
            console.log(`[Scale] Quantization scale set to: ${scaleName}`);
        }
    }
}

window.scaleEngine = new AROHAScaleEngine();