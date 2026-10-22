// analyser.js - Web Audio Analyser and Oscilloscope Renderer
export class AudioAnalyser {
    constructor(audioCtx, sourceNode, containerElement) {
        this.audioCtx = audioCtx;
        this.container = containerElement;
        
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        sourceNode.connect(this.analyser);

        this.canvas = document.createElement('canvas');
        this.updateDimensions();
        this.container.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        window.addEventListener('resize', () => {
            this.updateDimensions();
        });

        this.draw();
    }

    updateDimensions() {
        this.canvas.width = this.container.clientWidth || 600;
        this.canvas.height = this.container.clientHeight || 140;
        this.canvas.style.cssText = 'width: 100% !important; height: 100% !important; display: block;';
    }

    draw() {
        requestAnimationFrame(() => this.draw());

        this.analyser.getByteTimeDomainData(this.dataArray);

        this.ctx.fillStyle = '#090d16';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width * 1.0 / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}
