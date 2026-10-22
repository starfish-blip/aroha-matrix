// chladni2d.js - 2D Chladni Plate Resonance Renderer
export class ChladniField2D {
    constructor(containerElement) {
        this.container = containerElement;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.time = 0;
        this.m = 3;
        this.n = 5;
    }

    resize() {
        this.width = this.canvas.width = this.container.clientWidth || 300;
        this.height = this.canvas.height = this.container.clientHeight || 180;
    }

    setHarmonics(freq) {
        // Map frequency to Chladni mode numbers m and n
        this.m = Math.max(1, Math.floor((freq / 100) % 7));
        this.n = Math.max(1, Math.floor((freq / 150) % 8));
    }

    render() {
        this.time += 0.02;
        const w = this.width;
        const h = this.height;
        
        this.ctx.fillStyle = '#020305';
        this.ctx.fillRect(0, 0, w, h);

        const imgData = this.ctx.createImageData(w, h);
        const data = imgData.data;
        const scale = 3.14159 / w;
        
        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                const nx = (x - w / 2) * scale * 2;
                const ny = (y - h / 2) * scale * 2;
                
                const v = Math.cos(this.m * nx + Math.sin(this.time)) * Math.cos(this.n * ny) - 
                          Math.cos(this.n * nx) * Math.cos(this.m * ny + Math.cos(this.time));

                if (Math.abs(v) < 0.15) {
                    const idx = (y * w + x) * 4;
                    data[idx] = 0;     // R
                    data[idx + 1] = 255; // G
                    data[idx + 2] = 204; // B
                    data[idx + 3] = 220; // Alpha
                }
            }
        }

        this.ctx.putImageData(imgData, 0, 0);
        requestAnimationFrame(() => this.render());
    }
}
