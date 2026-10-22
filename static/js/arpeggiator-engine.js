class AROHAArpeggiator {
    constructor() {
        this.activeNotes = [];
        this.latchMode = false;
        this.timer = null;
        this.step = 0;
    }

    toggleLatch() {
        this.latchMode = !this.latchMode;
        console.log(`[Arp] Chord Latch Mode: ${this.latchMode}`);
        return this.latchMode;
    }

    addNote(note) {
        if (!this.activeNotes.includes(note)) {
            this.activeNotes.push(note);
        }
    }

    removeNote(note) {
        if (!this.latchMode) {
            this.activeNotes = this.activeNotes.filter(n => n !== note);
        }
    }

    stop() {
        this.activeNotes = [];
    }
}

window.arpeggiatorEngine = new AROHAArpeggiator();