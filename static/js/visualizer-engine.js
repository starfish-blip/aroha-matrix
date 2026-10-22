// AROHA Multi-Layer Audio-Reactive Visualizer Engine (Three.js)
class ArohaVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.layers = [];
        this.analyser = null;
        this.dataArray = null;
        this.frequency = 432.0;
        this.turbulence = 1.0;
        this.symmetry = 4;
        this.isInitialized = false;
    }

    init(audioEngine) {
        if (this.isInitialized) return;

        const container = document.getElementById('canvas-container');
        if (!container) return;

        // Hook up Web Audio Analyser if available
        if (audioEngine && audioEngine.audioCtx) {
            this.analyser = audioEngine.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            if (audioEngine.masterGain) {
                audioEngine.masterGain.connect(this.analyser);
            }
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 4.5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // --- CREATE 3 DISTINCT BACKGROUND LAYERS ---
        this.layers = [];

        // Layer 1: Inner Core (Icosahedron / Sacred Matrix)
        const geo1 = new THREE.IcosahedronGeometry(0.8, 2);
        const mat1 = new THREE.MeshStandardMaterial({ color: 0x00f0ff, wireframe: true, roughness: 0.1, metalness: 0.9 });
        const mesh1 = new THREE.Mesh(geo1, mat1);
        this.scene.add(mesh1);
        this.layers.push(mesh1);

        // Layer 2: Middle Vortex (Torus Knot)
        const geo2 = new THREE.TorusKnotGeometry(1.4, 0.25, 128, 32);
        const mat2 = new THREE.MeshStandardMaterial({ color: 0x0088ff, wireframe: true, roughness: 0.3, metalness: 0.7 });
        const mesh2 = new THREE.Mesh(geo2, mat2);
        this.scene.add(mesh2);
        this.layers.push(mesh2);

        // Layer 3: Outer Cage (Dodecahedron / Field Boundary)
        const geo3 = new THREE.DodecahedronGeometry(2.2, 0);
        const mat3 = new THREE.MeshStandardMaterial({ color: 0x00ffff, wireframe: true, roughness: 0.5, metalness: 0.5, transparent: true, opacity: 0.4 });
        const mesh3 = new THREE.Mesh(geo3, mat3);
        this.scene.add(mesh3);
        this.layers.push(mesh3);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00f0ff, 3, 50);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);

        window.addEventListener('resize', () => this.onWindowResize());

        this.isInitialized = true;
        this.animate();
        console.log("[Visualizer] 3-Layer Audio-Reactive Engine Initialized");
    }

    setFrequency(freq) {
        this.frequency = freq;
        // Brief impulse bump on frequency change
        if (this.layers[1]) {
            this.layers[1].scale.set(1.3, 1.3, 1.3);
        }
    }

    setTurbulence(val) {
        this.turbulence = parseFloat(val);
    }

    setSymmetry(fold) {
        this.symmetry = parseInt(fold);
    }

    applyThemeColors(themeName) {
        const palettes = {
            ocean: [0x00f0ff, 0x0088ff, 0x00ffff],
            solar: [0xf59e0b, 0xd97706, 0xfbbf24],
            nebula: [0x8b5cf6, 0xec4899, 0xa78bfa],
            matrix: [0x10b981, 0x059669, 0x34d399]
        };
        const colors = palettes[themeName] || palettes.ocean;
        this.layers.forEach((mesh, idx) => {
            if (mesh.material) {
                mesh.material.color.setHex(colors[idx % colors.length]);
            }
        });
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        let audioLevel = 0;
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            audioLevel = (sum / this.dataArray.length) / 128.0; // Normalized 0.0 to ~2.0+
        }

        // Animate layers independently with audio reactivity & smooth spring decay
        if (this.layers.length >= 3) {
            // Layer 1: Inner core rotates fast, pulses sharply to audio
            this.layers[0].rotation.x += 0.01 * this.turbulence;
            this.layers[0].rotation.y += 0.015 * this.turbulence;
            const scale1 = 0.9 + (audioLevel * 0.6);
            this.layers[0].scale.lerp(new THREE.Vector3(scale1, scale1, scale1), 0.1);

            // Layer 2: Torus knot rotates counter, reacts to audio mid-range
            this.layers[1].rotation.x -= 0.007 * this.turbulence;
            this.layers[1].rotation.z += 0.01 * this.turbulence;
            const scale2 = 1.0 + (audioLevel * 0.4);
            this.layers[1].scale.lerp(new THREE.Vector3(scale2, scale2, scale2), 0.1);

            // Layer 3: Outer cage slow stable rotation
            this.layers[2].rotation.y -= 0.003 * this.turbulence;
            this.layers[2].rotation.z += 0.002 * this.turbulence;
            const scale3 = 1.1 + (audioLevel * 0.2);
            this.layers[2].scale.lerp(new THREE.Vector3(scale3, scale3, scale3), 0.1);
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.arohaVisualizer = new ArohaVisualizer();
