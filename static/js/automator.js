// automator.js - Parameter LFO and Prime Automator
export class ParameterAutomator {
    constructor(field2d, field3d, inspector) {
        this.field2d = field2d;
        this.field3d = field3d;
        this.inspector = inspector;
        this.isActive = false;
        this.timer = null;
        this.step = 0;
    }

    toggle() {
        this.isActive = !this.isActive;
        if (this.isActive) { this.start(); } else { this.stop(); }
        return this.isActive;
    }

    start() {
        this.timer = setInterval(() => {
            this.step++;
            const mIdx = this.step % this.field2d.primes.length;
            const nIdx = (this.step + 7) % this.field2d.primes.length;
            
            this.field2d.setHarmonicsByPrimeIndex(mIdx, nIdx);
            
            const p1 = this.field2d.primes[mIdx];
            const p2 = this.field2d.primes[nIdx];
            this.field3d.setPrimeGeometry(p1 > 30 ? 3 : p1, p2 > 30 ? 5 : p2);

            this.inspector.update({
                freq: 220 + (this.step * 15) % 800,
                m: this.field2d.m,
                n: this.field2d.n,
                speed: this.field3d.speed
            });
        }, 1200);
    }

    stop() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }
}
