import http.server
import json
import os
import socketserver
import threading

PORT = 3000

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Engine v34 - Unified Ion Dimensional</title>
    <style>
        body { margin: 0; background: #05050a; color: #00ffcc; font-family: monospace; overflow: hidden; }
        #topbar { position: absolute; top: 0; width: 100%; background: rgba(0,0,0,0.8); padding: 10px; display: flex; justify-content: space-around; border-bottom: 1px solid #00ffcc; z-index: 10; font-size: 14px; }
        .group { display: flex; gap: 10px; }
        button { background: #111; color: #00ffcc; border: 1px solid #00ffcc; padding: 5px 10px; cursor: pointer; font-family: monospace; }
        button.active { background: #00ffcc; color: #000; font-weight: bold; }
        #canvas-container { width: 100vw; height: 100vh; }
        #status { position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); padding: 10px; border: 1px solid #333; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <div id="topbar">
        <div class="group" id="cosmology-btns">
            <button class="active" onclick="setCosmology('TORUS')">TORUS VIEW</button>
            <button onclick="setCosmology('NORSE')">NORSE 9 WORLDS</button>
            <button onclick="setCosmology('VEDIC')">VEDIC MERU</button>
            <button onclick="setCosmology('ENOCH')">ENOCH DOME</button>
        </div>
        <div class="group" id="page-btns">
            <button class="active" onclick="setPage('A')">PAGE A: LIVE</button>
            <button onclick="setPage('B')">PAGE B: BINAURAL</button>
            <button onclick="setPage('C')">PAGE C: COLOUR</button>
            <button onclick="setPage('D')">PAGE D: COSMO</button>
        </div>
        <div class="group">
            <button id="mic-btn" onclick="toggleMic()">MIC OFF</button>
            <button id="hrtf-btn" onclick="toggleHRTF()">HEADPHONE HRTF</button>
        </div>
        <div class="group" id="matter-btns">
            <button onclick="setMatter('SAND')">SAND</button>
            <button onclick="setMatter('WATER')">WATER</button>
            <button onclick="setMatter('CRYSTAL')">CRYSTAL</button>
            <button onclick="setMatter('GAS')">GAS</button>
            <button class="active" onclick="setMatter('ION')">ION</button>
        </div>
    </div>
    <div id="canvas-container"></div>
    <div id="status">MIDI: <span id="midi-status">Connecting...</span> | Page: A | Matter: ION | Ionization: <span id="ion-level">12%</span></div>

    <script>
        let scene, camera, renderer, particles, particleGeo, particleMat;
        let currentCosmology = 'TORUS', currentPage = 'A', currentMatter = 'ION';
        let micActive = false, hrtfActive = true, ionLevel = 12;

        function init() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);

            // 5,000 particle plasma cloud for Ionization state
            const particleCount = 5000;
            particleGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount * 3; i += 3) {
                positions[i] = (Math.random() - 0.5) * 40;
                positions[i+1] = (Math.random() - 0.5) * 40;
                positions[i+2] = (Math.random() - 0.5) * 40;
            }

            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleMat = new THREE.PointsMaterial({ color: 0x8844ff, size: 0.6, transparent: true, blending: THREE.AdditiveBlending });
            particles = new THREE.Points(particleGeo, particleMat);
            scene.add(particles);

            window.addEventListener('resize', onWindowResize);
            animate();
            initMIDI();
        }

        function animate() {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.002;
            particles.rotation.x += 0.001;
            renderer.render(scene, camera);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function setCosmology(mode) {
            currentCosmology = mode;
            updateActive('#cosmology-btns', event.target);
        }

        function setPage(page) {
            currentPage = page;
            updateActive('#page-btns', event.target);
            document.getElementById('status').innerText = `MIDI: Connected | Page: ${page} | Matter: ${currentMatter} | Ionization: ${ionLevel}%`;
        }

        function setMatter(matter) {
            currentMatter = matter;
            updateActive('#matter-btns', event.target);
            if (matter === 'ION') {
                particleMat.color.setHex(0x8844ff);
                ionLevel = 85;
            } else {
                particleMat.color.setHex(0x00ffcc);
                ionLevel = 10;
            }
            document.getElementById('ion-level').innerText = ionLevel + '%';
        }

        function toggleMic() {
            micActive = !micActive;
            const btn = document.getElementById('mic-btn');
            btn.innerText = micActive ? "MIC ON" : "MIC OFF";
            btn.classList.toggle('active', micActive);
        }

        function toggleHRTF() {
            hrtfActive = !hrtfActive;
            const btn = document.getElementById('hrtf-btn');
            btn.classList.toggle('active', hrtfActive);
        }

        function updateActive(groupSelector, target) {
            document.querySelectorAll(groupSelector + ' button').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
        }

        function initMIDI() {
            if (navigator.requestMIDIAccess) {
                navigator.requestMIDIAccess().then(access => {
                    document.getElementById('midi-status').innerText = "Connected (Oxygen 61)";
                    for (let input of access.inputs.values()) {
                        input.onmidimessage = handleMIDIMessage;
                    }
                }, () => {
                    document.getElementById('midi-status').innerText = "MIDI Access Denied";
                });
            } else {
                document.getElementById('midi-status').innerText = "WebMIDI Not Supported";
            }
        }

        function handleMIDIMessage(event) {
            const [status, note, velocity] = event.data;
            const command = status & 0xf0;
            if (command === 144 && velocity > 0) {
                // Note on: trigger ionization burst
                ionLevel = Math.min(100, ionLevel + 5);
                document.getElementById('ion-level').innerText = ionLevel + '%';
            }
        }

        window.onload = init;
    </script>
</body>
</html>
"""

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode("utf-8"))

def run_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving AROHA Engine v34 Unified Ion Dimensional at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == '__main__':
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down engine.")