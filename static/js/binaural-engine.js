// ==========================================
// AROHA v34 Binaural Lab & Brainwave Entrainment
// ==========================================

class ArohaBinauralEngine {
    constructor(audioEngine) {
        this.engine = audioEngine;
        this.leftOsc = null;
        this.rightOsc = null;
        this.merger = null;
        this.isActive = false;
    }

    startSession(baseFreq = 432, targetOffsetHz = 6.0) { // Default Theta entrainment (6 Hz)
        if (!this.engine || !this.engine.audioCtx) {
            console.warn("[BINAURAL] Audio engine not initialized.");
            return;
        }

        const ctx = this.engine.audioCtx;
        if (this.isActive) {
            this.stopSession();
        }

        // Create stereo splitter/merger or dual channel panners for binaural split
        const leftFreq = baseFreq - (targetOffsetHz / 2);
        const rightFreq = baseFreq + (targetOffsetHz / 2);

        this.leftOsc = ctx.createOscillator();
        this.rightOsc = ctx.createOscillator();

        this.leftOsc.type = 'sine';
        this.rightOsc.type = 'sine';

        this.leftOsc.frequency.setValueAtTime(leftFreq, ctx.currentTime);
        this.rightOsc.frequency.setValueAtTime(rightFreq, ctx.currentTime);

        const leftPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const rightPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const gainNode = ctx.createGain();

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        if (leftPanner && rightPanner) {
            leftPanner.pan.setValueAtTime(-1.0, ctx.currentTime); // Hard Left
            rightPanner.pan.setValueAtTime(1.0, ctx.currentTime);  // Hard Right

            this.leftOsc.connect(leftPanner);
            leftPanner.connect(gainNode);

            this.rightOsc.connect(rightPanner);
            rightPanner.connect(gainNode);
        } else {
            // Fallback connection if StereoPanner not supported
            this.leftOsc.connect(gainNode);
            this.rightOsc.connect(gainNode);
        }

        gainNode.connect(this.engine.masterGain);

        this.leftOsc.start();
        this.rightOsc.start();
        this.isActive = true;

        console.log(`[BINAURAL] Active: Base ${baseFreq}Hz | Offset ${targetOffsetHz}Hz (L: ${leftFreq.toFixed(2)}Hz, R: ${rightFreq.toFixed(2)}Hz)`);
    }

    stopSession() {
        if (this.isActive) {
            try {
                if (this.leftOsc) this.leftOsc.stop();
                if (this.rightOsc) this.rightOsc.stop();
            } catch (e) {}
            this.isActive = false;
            console.log("[BINAURAL] Session stopped.");
        }
    }
}

window.binauralEngine = new ArohaBinauralEngine(window.acousticEngine);