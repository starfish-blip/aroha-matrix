// midiMapping.js - MIDI CC Parameter Mapping Manager
export class MIDIMappingManager {
    constructor(field2d, field3d) {
        this.field2d = field2d;
        this.field3d = field3d;
        this.ccMap = { 74: 'cutoff', 71: 'resonance', 7: 'masterVolume' };
    }

    handleCC(ccNumber, value) {
        const normalized = value / 127;
        if (ccNumber === 74) {
            const mIdx = Math.floor(normalized * (this.field2d.primes.length - 1));
            this.field2d.setHarmonicsByPrimeIndex(mIdx, this.field2d.nIndex);
        } else if (ccNumber === 71) {
            const nIdx = Math.floor(normalized * (this.field2d.primes.length - 1));
            this.field2d.setHarmonicsByPrimeIndex(this.field2d.mIndex, nIdx);
        } else if (ccNumber === 7 && window.masterGain) {
            window.masterGain.gain.setValueAtTime(normalized * 0.5, window.audioCtx.currentTime);
        }
    }
}
