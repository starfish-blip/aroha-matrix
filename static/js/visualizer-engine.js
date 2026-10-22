class ArohaVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.count = 15000;
        this.turbulence = 1.0;
        this.frequency = 432.0;
        this.symmetry = 4;
        this.synthesisMode = false;
    }

    init(audioEngine) {
        this.audioEngine = audioEngine;
        const container = document.getElementById('canvas-container');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 50;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);

        for (let i = 0; i < this.count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 80;
            positions[i+1] = (Math.random() - 0.5) * 80;
            positions[i+2] = (Math.random() - 0.5) * 80;

            colors[i] = 0.0;
            colors[i+1] = 0.94;
            colors[i+2] = 1.0;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.material = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.85
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    setTurbulence(val) {
        this.turbulence = parseFloat(val);
    }

    setFrequency(freq) {
        this.frequency = freq;
    }

    setSymmetry(sym) {
        this.symmetry = parseInt(sym);
    }

    toggleSynthesisDemonstration() {
        this.synthesisMode = !this.synthesisMode;
        return this.synthesisMode;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const positions = this.geometry.attributes.position.array;
        const time = Date.now() * 0.001 * this.turbulence;

        let audioLevel = 0.1;
        if (this.audioEngine && this.audioEngine.analyser) {
            const data = new Uint8Array(this.audioEngine.analyser.frequencyBinCount);
            this.audioEngine.analyser.getByteFrequencyData(data);
            const sum = data.reduce((a, b) => a + b, 0);
            audioLevel = (sum / data.length) / 128.0;
        }

        for (let i = 0; i < this.count * 3; i += 3) {
            let x = positions[i];
            let y = positions[i+1];
            let z = positions[i+2];

            // Waveform displacement and symmetry modulation
            positions[i+1] += Math.sin(time + x * 0.05) * 0.05 * (audioLevel + 0.5) * this.turbulence;
            positions[i] += Math.cos(time + y * 0.05) * 0.05 * (audioLevel + 0.5) * this.turbulence;

            // Reset bounds
            if (Math.abs(positions[i]) > 60) positions[i] *= -0.9;
            if (Math.abs(positions[i+1]) > 60) positions[i+1] *= -0.9;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.particles.rotation.y = time * 0.1;
        this.particles.rotation.z = time * 0.05;

        this.renderer.render(this.scene, this.camera);
    }
}

window.arohaVisualizer = new ArohaVisualizer();
