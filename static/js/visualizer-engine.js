// AROHA Unified 3-Layer Audio-Reactive Visualizer Engine
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

        if (audioEngine && audioEngine.audioCtx) {
            this.analyser = audioEngine.audioCtx.createAnalyser();
            this.analyser.fftSize = 512;
            if (audioEngine.masterGain) {
                audioEngine.masterGain.connect(this.analyser);
            }
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 4.5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // --- LAYER 1: INNER CORE (Icosahedron - High Frequency Detail) ---
        const geo1 = new THREE.IcosahedronGeometry(0.9, 2);
        const mat1 = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x0044aa,
            wireframe: true,
            roughness: 0.1,
            metalness: 0.9
        });
        const mesh1 = new THREE.Mesh(geo1, mat1);
        this.scene.add(mesh1);
        this.layers.push(mesh1);

        // --- LAYER 2: MIDDLE VORTEX (Torus Knot - Main Audio Driver) ---
        const geo2 = new THREE.TorusKnotGeometry(1.3, 0.3, 128, 32);
        const mat2 = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x002266,
            wireframe: true,
            roughness: 0.2,
            metalness: 0.8
        });
        const mesh2 = new THREE.Mesh(geo2, mat2);
        this.scene.add(mesh2);
        this.layers.push(mesh2);

        // --- LAYER 3: OUTER FIELD CAGE (Dodecahedron - Sacred Boundary) ---
        const geo3 = new THREE.DodecahedronGeometry(2.4, 0);
        const mat3 = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0369a1,
            wireframe: true,
            roughness: 0.4,
            metalness: 0.5,
            transparent: true,
            opacity: 0.6
        });
        const mesh3 = new THREE.Mesh(geo3, mat3);
        this.scene.add(mesh3);
        this.layers.push(mesh3);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00f0ff, 4, 50);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);

        window.addEventListener('resize', () => this.onWindowResize());

        this.isInitialized = true;
        this.animate();
        console.log("[Visualizer] 3-Layer Fully Reactive Engine Initialized");
    }

    setFrequency(freq) {
        this.frequency = freq;
        // Punch scale on trigger
        if (this.layers[1]) {
            this.layers[1].scale.set(1.4, 1.4, 1.4);
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
            ocean: { c1: 0x00f0ff, c2: 0x0088ff, c3: 0x38bdf8 },
            solar: { c1: 0xf59e0b, c2: 0xd97706, c3: 0xfbbf24 },
            nebula: { c1: 0x8b5cf6, c2: 0xec4899, c3: 0xa78bfa },
            matrix: { c1: 0x10b981, c2: 0x059669, c3: 0x34d399 }
        };
        const p = palettes[themeName] || palettes.ocean;
        if (this.layers[0]) this.layers[0].material.color.setHex(p.c1);
        if (this.layers[1]) this.layers[1].material.color.setHex(p.c2);
        if (this.layers[2]) this.layers[2].material.color.setHex(p.c3);
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
            audioLevel = (sum / this.dataArray.length) / 100.0;
        }

        // Smooth organic decay back to baseline instead of getting stuck
        if (this.layers.length >= 3) {
            // Layer 1: Inner core
            this.layers[0].rotation.x += 0.008 * this.turbulence;
            this.layers[0].rotation.y += 0.012 * this.turbulence;
            const targetScale1 = 0.9 + (audioLevel * 0.8);
            this.layers[0].scale.lerp(new THREE.Vector3(targetScale1, targetScale1, targetScale1), 0.15);

            // Layer 2: Torus Knot main body
            this.layers[1].rotation.x -= 0.005 * this.turbulence;
            this.layers[1].rotation.z += 0.008 * this.turbulence;
            const targetScale2 = 1.0 + (audioLevel * 0.5);
            this.layers[1].scale.lerp(new THREE.Vector3(targetScale2, targetScale2, targetScale2), 0.15);

            // Layer 3: Outer cage
            this.layers[2].rotation.y -= 0.003 * this.turbulence;
            this.layers[2].rotation.z += 0.002 * this.turbulence;
            const targetScale3 = 1.1 + (audioLevel * 0.3);
            this.layers[2].scale.lerp(new THREE.Vector3(targetScale3, targetScale3, targetScale3), 0.15);
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.arohaVisualizer = new ArohaVisualizer();
