// AROHA Unified Visualizer Engine (Three.js)
class ArohaVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.layers = [];
        this.frequency = 432.0;
        this.turbulence = 1.0;
        this.symmetry = 4;
        this.isInitialized = false;
        this.animationId = null;
    }

    init(audioEngine) {
        if (this.isInitialized) return;

        const container = document.getElementById('canvas-container');
        if (!container) return;

        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Create Sacred Geometry Mesh Layers
        const geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            wireframe: true,
            roughness: 0.2,
            metalness: 0.8
        });

        this.primaryMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.primaryMesh);

        // Ambient & Directional Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00f0ff, 2, 50);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);

        // Window resize listener
        window.addEventListener('resize', () => this.onWindowResize());

        this.isInitialized = true;
        this.animate();
        console.log("[Visualizer] Engine Initialized and Running");
    }

    setFrequency(freq) {
        this.frequency = freq;
        if (this.primaryMesh) {
            const scaleFactor = 0.8 + (freq / 800.0);
            this.primaryMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    }

    setTurbulence(val) {
        this.turbulence = val;
    }

    setSymmetry(fold) {
        this.symmetry = parseInt(fold);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.primaryMesh) {
            this.primaryMesh.rotation.x += 0.005 * this.turbulence;
            this.primaryMesh.rotation.y += 0.008 * this.turbulence;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.arohaVisualizer = new ArohaVisualizer();
