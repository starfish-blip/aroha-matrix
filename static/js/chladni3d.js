// chladni3d.js - Prime-Driven Three.js Toroidal Field Renderer
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class ChladniField3D {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        this.geometry = new THREE.TorusKnotGeometry(8, 2.5, 100, 16, 3, 5);
        this.material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
        this.torus = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.torus);

        this.camera.position.z = 25;
        this.speed = 0.01;

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    setPrimeGeometry(p1, p2) {
        this.scene.remove(this.torus);
        this.geometry.dispose();
        this.geometry = new THREE.TorusKnotGeometry(8, 2.5, 100, 16, p1, p2);
        this.torus = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.torus);
    }

    setSpeed(freq) {
        this.speed = 0.005 + (freq / 4000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.torus.rotation.x += this.speed;
        this.torus.rotation.y += this.speed * 1.3;
        this.renderer.render(this.scene, this.camera);
    }
}
