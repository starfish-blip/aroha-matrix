from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="AROHA Engine v35 - Complete Unified Workstation")

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Engine v35 Workstation</title>
    <style>
        body { margin: 0; background: #020208; overflow: hidden; font-family: monospace; color: #0ff; }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1; }
        #ui-container {
            position: absolute; top: 20px; left: 20px; width: 860px;
            background: rgba(5, 10, 20, 0.85); border: 1px solid #0ff;
            padding: 15px; box-sizing: border-box; z-index: 20; border-radius: 12px;
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.3); backdrop-filter: blur(10px);
            user-select: none; transition: transform 0.3s ease, opacity 0.3s ease;
        }
        #ui-container.collapsed { transform: translateX(-900px); opacity: 0; pointer-events: none; }
        .drag-header { cursor: move; background: rgba(0, 255, 255, 0.1); padding: 5px 10px; border-radius: 6px; margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .top-bar, .page-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        button, select {
            background: #002b36; color: #839496; border: 1px solid #0ff;
            padding: 6px 12px; font-family: monospace; font-size: 0.8rem; cursor: pointer; border-radius: 4px;
        }
        button:hover, select:hover { background: #0ff; color: #000; font-weight: bold; }
        button.active { background: #0ff; color: #000; font-weight: bold; }
        .section-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; margin-top: 10px; }
        .panel { background: rgba(0,0,0,0.4); border: 1px solid rgba(0,255,255,0.3); padding: 8px; border-radius: 6px; font-size: 0.75rem; }
        .fader-bank { display: flex; justify-content: space-between; gap: 4px; height: 120px; align-items: flex-end; padding-top: 10px; }
        .fader-col { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .fader-col input[type=range] { writing-mode: vertical-lr; direction: rtl; width: 20px; height: 80px; accent-color: #0ff; cursor: pointer; }
        .status-footer { font-size: 0.75rem; color: #0f0; border-top: 1px dashed #0ff; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; }
        #keyboard-tray { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 860px; background: rgba(5,10,20,0.9); border: 1px solid #0ff; padding: 10px; border-radius: 8px; z-index: 20; text-align: center; }
    </style>
</head>
<body>
    <div id="canvas-container"></div>

    <div id="ui-container">
        <div class="drag-header" id="dragHeader">
            <span>AROHA ENGINE v35 // UNIFIED WORKSTATION</span>
            <button onclick="toggleHUD()" style="padding: 2px 6px; margin:0;">[ Toggle HUD ]</button>
        </div>
        <div class="top-bar">
            <button class="active" onclick="setMode('torus')">TORUS VIEW</button>
            <button onclick="setMode('norse')">NORSE 9 WORLDS</button>
            <button onclick="setMode('vedic')">VEDIC MERU</button>
            <button onclick="setMode('enoch')">ENOCH DOME</button>
        </div>
        <div class="page-row">
            <button class="active" onclick="setPage('A')">PAGE A: LIVE KEYS</button>
            <button onclick="setPage('B')">PAGE B: BINAURAL LAB</button>
            <button onclick="setPage('C')">PAGE C: COLOUR LIGHT</button>
            <button onclick="setPage('D')">PAGE D: COSMO</button>
            <select id="tuningSelect" onchange="updateTuning()">
                <option value="equal">Equal Temperament</option>
                <option value="just">Just Intonation</option>
                <option value="432">432Hz Harmonic</option>
                <option value="528">528Hz Solfeggio</option>
            </select>
        </div>
        <div class="section-grid">
            <div class="panel">
                <strong>CYMATIC PLATE</strong>
                <div id="plateLog" style="height: 80px; overflow-y:auto; margin-top:5px; color:#a1efce;">Node active. Childe geometry synced.</div>
            </div>
            <div class="panel">
                <strong>12-OCTAVE FADER BANK // COSMOLOGICAL TUNING</strong>
                <div class="fader-bank" id="faderBank"></div>
            </div>
            <div class="panel">
                <strong>TOROIDAL FIELD</strong>
                <div id="fieldLog" style="height: 80px; overflow-y:auto; margin-top:5px; color:#0ff;">Field Strength: 2.41 T<br>Phase Locked.</div>
            </div>
        </div>
        <div class="status-footer">
            <span id="systemStatus">System Online. MIDI Ready.</span>
            <span id="plasmaStatus">IONIZATION: 5000 Particles // Corona: Active</span>
        </div>
    </div>

    <div id="keyboard-tray">
        <div style="font-size:0.8rem; margin-bottom:4px; color:#0ff;">OXYGEN 61 // MIDI KEYBOARD CONTROLLER — <span id="midiState">AWAITING CONNECTION</span></div>
        <div id="keyDisplay" style="font-size:0.75rem; color:#839496;">Press any key to initiate resonance matrix.</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script>
        // HUD Drag Logic
        const ui = document.getElementById('ui-container');
        const header = document.getElementById('dragHeader');
        let isDragging = false, startX, startY;
        header.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX - ui.offsetLeft; startY = e.clientY - ui.offsetTop; });
        window.addEventListener('mousemove', e => { if(isDragging) { ui.style.left = (e.clientX - startX) + 'px'; ui.style.top = (e.clientY - startY) + 'px'; }});
        window.addEventListener('mouseup', () => { isDragging = false; });
        function toggleHUD() { ui.classList.toggle('collapsed'); }

        // Audio & State
        let audioCtx = null, activePage = 'A', currentTuning = 'equal';
        const labels = ['Jotunheim','Midgard','Nidavellir','Hel','Niflheim','Muspelheim','Alfheim','Vanaheim','Asgard','Patala','Bhuloka','Meru'];
        
        const faderContainer = document.getElementById('faderBank');
        const gains = [];
        labels.forEach((name, i) => {
            let col = document.createElement('div');
            col.className = 'fader-col';
            col.innerHTML = `<span style="font-size:0.65rem">${name}</span><input type="range" min="0" max="100" value="70" data-index="${i}"><span style="font-size:0.6rem" id="fval${i}">0.0dB</span>`;
            faderContainer.appendChild(col);
            gains.push(0.7);
        });

        function initAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }

        function setPage(p) {
            activePage = p;
            document.querySelectorAll('.page-row button').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('systemStatus').innerText = `Page ${p} Active // Mode Synchronized`;
        }
        function setMode(m) {
            document.querySelectorAll('.top-bar button').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
        }
        function updateTuning() { currentTuning = document.getElementById('tuningSelect').value; }

        // Three.js Scene & Plasma
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const geom = new THREE.TorusKnotGeometry(12, 3.5, 128, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
        const torusMesh = new THREE.Mesh(geom, mat);
        scene.add(torusMesh);

        // Particle Ionization Engine (5000 particles)
        const pCount = 5000;
        const pGeo = new THREE.BufferGeometry();
        const pPositions = new Float32Array(pCount * 3);
        for(let i=0; i<pCount*3; i+=3) {
            pPositions[i] = (Math.random() - 0.5) * 50;
            pPositions[i+1] = (Math.random() - 0.5) * 50;
            pPositions[i+2] = (Math.random() - 0.5) * 50;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.15, transparent: true, opacity: 0.7 });
        const particleSystem = new THREE.Points(pGeo, pMat);
        scene.add(particleSystem);

        camera.position.z = 40;
        let clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            let t = clock.getElapsedTime();
            torusMesh.rotation.x += 0.003;
            torusMesh.rotation.y += 0.005;
            
            let r = Math.sin(t * 0.7) * 0.5 + 0.5;
            let b = Math.cos(t * 0.5) * 0.5 + 0.5;
            mat.color.setRGB(r, 0.2, b);

            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // MIDI Integration
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(m => {
                document.getElementById('midiState').innerText = "CONNECTED (OXYGEN 61)";
                for (let input of m.inputs.values()) {
                    input.onmidimessage = handleMIDI;
                }
            }, () => { document.getElementById('midiState').innerText = "FAILED"; });
        }

        function handleMIDI(msg) {
            initAudio();
            let [cmd, note, vel] = msg.data;
            vel = vel || 0;
            if (cmd >= 144 && cmd <= 159 && vel > 0) {
                let freq = 440 * Math.pow(2, (note - 69) / 12);
                if (currentTuning === '432') freq = 432 * Math.pow(2, (note - 69) / 12);
                if (currentTuning === '528') freq = 528 * Math.pow(2, (note - 69) / 12);

                playTone(freq, vel);
                triggerVisualPulse(vel, freq, note);
            }
        }

        function playTone(freq, vel) {
            if (!audioCtx) return;
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            let gVal = (vel / 127) * 0.12;
            gain.gain.setValueAtTime(gVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 1.2);
        }

        function triggerVisualPulse(vel, freq, note) {
            let scale = 1 + (vel / 127) * 0.3;
            torusMesh.scale.set(scale, scale, scale);
            setTimeout(() => torusMesh.scale.set(1,1,1), 120);

            let hue = Math.floor((note / 127) * 360);
            mat.color.setHSL(hue / 360, 0.8, 0.5);

            document.getElementById('keyDisplay').innerHTML = `Note: ${note} | Freq: ${freq.toFixed(1)}Hz | Velocity: ${vel}`;
            document.getElementById('plateLog').innerHTML = `Trigger Note ${note} // Freq ${freq.toFixed(1)}Hz locked.`;
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return HTML_CONTENT

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aroha_engine:app", host="127.0.0.1", port=8000, reload=False)
