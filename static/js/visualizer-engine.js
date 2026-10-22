class AROHAVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.layers = [];
        this.audioEngine = null;
        this.dataArray = new Uint8Array(128);
        this.currentFreq = 432;
        this.symmetryMode = 4;
        this.turbulenceIntensity = 1.0;
        this.demonstrateSynthesisActive = false;
    }

    init(audioEngine) {
        this.audioEngine = audioEngine;
        const container = document.getElementById('canvas-container');
        if (!container) return;

        container.innerHTML = '';

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 6;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        const layerConfigs = [
            { name: 'Solids', radius: 1.0, tube: 0.2, size: 0.02, color: 0x3b82f6, speedX: 0.002, speedY: 0.003 },
            { name: 'Liquids', radius: 1.8, tube: 0.3, size: 0.03, color: 0x06b6d4, speedX: -0.003, speedY: 0.004 },
            { name: 'Gases', radius: 2.6, tube: 0.5, size: 0.04, color: 0x8b5cf6, speedX: 0.004, speedY: -0.002 }
        ];

        this.layers = layerConfigs.map(config => {
            const geometry = new THREE.TorusGeometry(config.radius, config.tube, 24, 120);
            const positionAttribute = geometry.attributes.position;
            const originalPositions = new Float32Array(positionAttribute.array);

            const material = new THREE.PointsMaterial({
                size: config.size,
                color: config.color,
                transparent: true,
                opacity: 0.85
            });
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);
            return { points, geometry, originalPositions, material, config };
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.animate();
        console.log("[Visualizer] Shader Uniform & Synthesis Demonstration Engine Active");
    }

    setSymmetry(mode) {
        this.symmetryMode = parseInt(mode);
    }

    setTurbulence(val) {
        this.turbulenceIntensity = parseFloat(val);
    }

    toggleSynthesisDemonstration() {
        this.demonstrateSynthesisActive = !this.demonstrateSynthesisActive;
        console.log(`[Visualizer] Demonstrate Synthesis Mode: ${this.demonstrateSynthesisActive}`);
        return this.demonstrateSynthesisActive;
    }

    setFrequency(freq) {
        this.currentFreq = freq;
        this.layers.forEach((layer, idx) => {
            const hue = ((freq * (idx + 1)) % 600) / 600;
            layer.material.color.setHSL(hue, 1.0, 0.5);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.audioEngine && typeof this.audioEngine.getAudioData === 'function') {
            this.audioEngine.getAudioData(this.dataArray);
        }

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const audioLevel = sum / this.dataArray.length / 128.0;
        const time = Date.now() * 0.002;

        this.layers.forEach((layer, layerIdx) => {
            // If synthesis demonstration is active, make the middle layer (Liquids) interpolate 
            // as the direct mathematical translation between the inner (Solids) and outer (Gases) layers.
            if (this.demonstrateSynthesisActive && layerIdx === 1) {
                const innerRadius = this.layers[0].config.radius;
                const outerRadius = this.layers[2].config.radius;
                // Middle layer oscillates as the median interpreter between inner and outer bounds
                layer.config.radius = ((innerRadius + outerRadius) / 2) + Math.sin(time * 2) * 0.4;
            }

            layer.points.rotation.x += layer.config.speedX * (1 + audioLevel * 2) * this.turbulenceIntensity;
            layer.points.rotation.y += layer.config.speedY * (1 + audioLevel * 2) * this.turbulenceIntensity;

            const positionAttribute = layer.geometry.attributes.position;
            const orig = layer.originalPositions;

            for (let i = 0; i < positionAttribute.count; i++) {
                const ox = orig[i * 3];
                const oy = orig[i * 3 + 1];
                const oz = orig[i * 3 + 2];

                const angle = Math.atan2(oy, ox);
                const symmetryFactor = Math.cos(angle * this.symmetryMode + time) * 0.2;

                const freqBin = this.dataArray[i % this.dataArray.length] / 128.0;
                let wave = ((Math.sin(time + i + (layerIdx * 2)) * freqBin * 0.15) + symmetryFactor * audioLevel) * this.turbulenceIntensity;

                // When demonstrating synthesis, the middle layer interprets outer vs inner forces directly
                if (this.demonstrateSynthesisActive && layerIdx === 1) {
                    wave *= 2.0; // amplify the interpretation interference pattern
                }

                positionAttribute.setXYZ(
                    i,
                    ox + (ox * wave),
                    oy + (oy * wave),
                    oz + (oz * wave)
                );
            }
            positionAttribute.needsUpdate = true;
        });

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.arohaVisualizer = new AROHAVisualizer();