window.initRenderers = function() {
    const cymCanvas = document.getElementById('cymaticCanvas');
    if (cymCanvas) {
        const ctx = cymCanvas.getContext('2d');
        function drawCymatic() {
            const w = cymCanvas.width = cymCanvas.clientWidth || 400;
            const h = cymCanvas.height = cymCanvas.clientHeight || 280;
            const t = Date.now() * 0.002;
            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35;
            for (let a = 0; a < Math.PI * 2; a += 0.02) {
                const wave = Math.sin(a * 8 + t) * 15;
                const radius = r + wave;
                const x = cx + Math.cos(a) * radius;
                const y = cy + Math.sin(a) * radius;
                if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            requestAnimationFrame(drawCymatic);
        }
        drawCymatic();
    }

    const torusCanvas = document.getElementById('torusCanvas');
    if (torusCanvas && typeof THREE !== 'undefined') {
        const width = torusCanvas.clientWidth || 400;
        const height = 280;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.z = 4;
        const renderer = new THREE.WebGLRenderer({ canvas: torusCanvas, antialias: true });
        renderer.setSize(width, height);
        const geometry = new THREE.TorusGeometry(1, 0.3, 16, 100);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
        const torus = new THREE.Mesh(geometry, material);
        scene.add(torus);
        function animateTorus() {
            requestAnimationFrame(animateTorus);
            torus.rotation.x += 0.01;
            torus.rotation.y += 0.015;
            renderer.render(scene, camera);
        }
        animateTorus();
    }
};
async function syncRemote() {
    const payload = {
        timestamp: new Date().toISOString(),
        faders: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        frequency: 432.0,
        fx: { reverb: true, delay: false }
    };
    try {
        const res = await fetch('/api/sync-remote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert('Sync Result: ' + JSON.stringify(data, null, 2));
    } catch (err) {
        alert('Sync failed: ' + err);
    }
}
