// chladni.js - Prime-Driven 2D Chladni Resonance Plate Engine
export class ChladniField2D {
    constructor(containerElement) {
        this.container = containerElement;
        this.canvas = document.createElement('canvas');
        this.updateDimensions();
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];
        this.mIndex = 0;
        this.nIndex = 2;
        this.m = this.primes[this.mIndex];
        this.n = this.primes[this.nIndex];
        this.draw();

        window.addEventListener('resize', () => {
            this.updateDimensions();
            this.draw();
        });
    }

    updateDimensions() {
        const width = this.container.clientWidth || 300;
        const height = this.container.clientHeight || 160;
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.cssText = 'width: 100% !important; height: 100% !important; display: block;';
    }

    setHarmonicsByPrimeIndex(mIdx, nIdx) {
        this.mIndex = mIdx % this.primes.length;
        this.nIndex = nIdx % this.primes.length;
        this.m = this.primes[this.mIndex];
        this.n = this.primes[this.nIndex];
        this.draw();
    }

    setHarmonics(freq) {
        const idx = Math.floor((freq / 1000) * this.primes.length) % this.primes.length;
        this.m = this.primes[idx];
        this.n = this.primes[(idx + 5) % this.primes.length];
        this.draw();
    }

    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imgData = this.ctx.createImageData(width, height);
        const data = imgData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = (x / width) * Math.PI * this.m;
                const ny = (y / height) * Math.PI * this.n;
                
                const val = Math.cos(nx) * Math.cos(ny) - Math.sin(nx) * Math.sin(ny);
                const intensity = Math.abs(val) < 0.12 ? 255 : 0;

                const index = (y * width + x) * 4;
                data[index]     = 0;
                data[index + 1] = intensity;
                data[index + 2] = intensity > 0 ? 204 : 10;
                data[index + 3] = 255;
            }
        }
        this.ctx.putImageData(imgData, 0, 0);
    }
}
