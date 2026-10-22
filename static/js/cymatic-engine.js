// ==========================================
// AROHA v34 Cymatic Plate & Chladni Renderer
// ==========================================

class ArohaCymaticEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            // Create canvas dynamically if not present in DOM
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'cymatic-canvas';
            this.canvas.width = 250;
            this.canvas.height = 250;
            this.canvas.style.borderRadius = '50%';
            this.canvas.style.border = '2px solid #00f0ff';
            document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.frequency = 432;
        this.mode = 4; // Chladni mode selector
    }

    setFrequency(freq) {
        this.frequency = freq;
        this.render();
    }

    render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, width, height);

        const imgData = this.ctx.createImageData(width, height);
        const data = imgData.data;

        // Scale mode based on frequency / 100
        const m = (this.frequency / 100) % 6 + 2;
        const n = 3;

        for (let x = 0; x < width; x += 2) {
            for (let y = 0; y < height; y += 2) {
                // Normalized coordinates [-1, 1]
                const nx = (x - cx) / cx;
                const ny = (y - cy) / cy;
                
                if (nx*nx + ny*ny <= 1.0) { // Circular plate boundary
                    // Chladni plate standing wave formula
                    const val = Math.cos(m * Math.PI * nx) * Math.cos(n * Math.PI * ny) - 
                                Math.cos(n * Math.PI * nx) * Math.cos(m * Math.PI * ny);
                    
                    // Nodal lines (where val is close to 0) accumulate sand particles (glowing cyan)
                    if (Math.abs(val) < 0.15) {
                        const idx = (y * width + x) * 4;
                        data[idx]     = 0;   // R
                        data[idx + 1] = 240; // G
                        data[idx + 2] = 255; // B
                        data[idx + 3] = 255; // Alpha
                    }
                }
            }
        }

        this.ctx.putImageData(imgData, 0, 0);
    }
}

window.cymaticEngine = new ArohaCymaticEngine('cymatic-canvas');
window.cymaticEngine.render();