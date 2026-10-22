from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="AROHA Engine v37 - Master Workstation")

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Engine v37 Master Workstation</title>
    <style>
        body { margin: 0; background: #020208; overflow: hidden; font-family: monospace; color: #0ff; }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1; }
        #ui-container {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%); width: 920px;
            background: rgba(5, 12, 25, 0.92); border: 1px solid #0ff;
            padding: 15px; box-sizing: border-box; z-index: 20; border-radius: 12px;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.35); backdrop-filter: blur(12px);
            user-select: none;
        }
        .drag-header { background: rgba(0, 255, 255, 0.15); padding: 6px 12px; border-radius: 6px; margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(0,255,255,0.3); }
        .top-bar, .page-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; justify-content: center; }
        button, select {
            background: #002b36; color: #839496; border: 1px solid #0ff;
            padding: 6px 12px; font-family: monospace; font-size: 0.8rem; cursor: pointer; border-radius: 4px;
        }
        button:hover, select:hover { background: #0ff; color: #000; font-weight: bold; }
        button.active { background: #0ff; color: #000; font-weight: bold; }
        .section-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; margin-top: 10px; }
        .panel { background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,255,0.3); padding: 10px; border-radius: 6px; font-size: 0.75rem; }
        .fader-bank { display: flex; justify-content: space-between; gap: 4px; height: 110px; align-items: flex-end; padding-top: 10px; }
        .fader-col { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .fader-col input[type=range] { writing-mode: vertical-lr; direction: rtl; width: 20px; height: 75px; accent-color: #0ff; cursor: pointer; }
        .status-footer { font-size: 0.75rem; color: #0f0; border-top: 1px dashed #0ff; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; }
        #keyboard-tray { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); width: 920px; background: rgba(5,12,25,0.95); border: 1px solid #0ff; padding: 12px; border-radius: 8px; z-index: 20; text-align: center; box-shadow: 0 0 30px rgba(0,255,255,0.25); }
    </style>
</head>
<body onclick="unlockAudio()">
    <div id="canvas-container"></div>

    <div id="ui-container">
        <div class="drag-header">
            <span>AROHA ENGINE v37 // MASTER COSMOLOGICAL WORKSTATION</span>
            <span style="color: #0f0; font-size: 0.75rem;">● AUDIO READY (CLICK ANYWHERE TO ENGAGE)</span>
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
                <option value="acoustic">Acoustic / Resonator Folk</option>
                <option value="432">432Hz Harmonic</option>
                <option value="528">528Hz Solfeggio</option>
            </select>
        </div>
        <div class="section-grid">
            <div class="panel">
                <strong>CYMATIC PLATE</strong>
                <div id="plateLog" style="height: 75px; overflow-y:auto; margin-top:5px; color:#a1efce;">Matrix initialized. Ready for MIDI input.</div>
            </div>
            <div class="panel">
                <strong>12-OCTAVE FADER BANK // COSMOLOGICAL TUNING</strong>
                <div class="fader-bank" id="faderBank"></div>
            </div>
            <div class="panel">
                <strong>TOROIDAL FIELD</strong>
                <div id="fieldLog" style="height: 75px; overflow-y:auto; margin-top:5px; color:#0ff;">Field Strength: 2.41 T<br>Phase Locked.</div>
            </div>
        </div>
        <div class="status-footer">
            <span id="systemStatus">System Online. Harmonic Resonator Matrix Active.</span>
            <span id="plasmaStatus">IONIZATION: 5000 Particles // Corona: Active</span>
        </div>
    </div>

    <div id="keyboard-tray">
        <div style="font-size:0.8rem; margin-bottom:4px; color:#0ff;">OXYGEN 61 // MIDI KEYBOARD CONTROLLER — <span id="midiState">AWAITING CONNECTION</span></div>
        <div id="keyDisplay" style="font-size:0.75rem; color:#839496;">Play keys to generate frequency, sound, and visual resonance.</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script>
        let audioCtx = null, activePage = 'A', currentTuning = 'equal';
        const labels = ['Jotunheim','Midgard','Nidavellir','Hel','Niflheim','Muspelheim','Alfheim','Vanaheim','Asgard','Patala','Bhuloka','Meru'];
        
        const faderContainer = document.getElementById('faderBank');
        labels.forEach((name, i) => {
            let col = document.createElement('div');
            col.className = 'fader-col';
            col.innerHTML = `<span style="font-size:0.6rem">${name}</span><input type="range" min="0" max="100" value="70"><span style="font-size:0.55rem">0.0dB</span>`;
            faderContainer.appendChild(col);
        });

        function unlockAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
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

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(m => {
                document.getElementById('midiState').innerText = "CONNECTED (OXYGEN 61)";
                for (let input of m.inputs.values()) {
                    input.onmidimessage = handleMIDI;
                }
            }, () => { document.getElementById('midiState').innerText = "FAILED"; });
        }

        function handleMIDI(msg) {
            unlockAudio();
            let [cmd, note, vel] = msg.data;
            vel = vel || 0;
            if (cmd >= 144 && cmd <= 159 && vel > 0) {
                let freq = 440 * Math.pow(2, (note - 69) / 12);
                if (currentTuning === '432') freq = 432 * Math.pow(2, (note - 69) / 12);
                if (currentTuning === '528') freq = 528 * Math.pow(2, (note - 69) / 12);
                if (currentTuning === 'acoustic') freq = 440 * Math.pow(2, (note - 69) / 12) * 0.998;

                playTone(freq, vel);
                triggerVisualPulse(vel, freq, note);
            }
        }

        function playTone(freq, vel) {
            if (!audioCtx) return;
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = currentTuning === 'acoustic' ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            let gVal = (vel / 127) * 0.15;
            gain.gain.setValueAtTime(gVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 1.5);
        }

        function triggerVisualPulse(vel, freq, note) {
            let scale = 1 + (vel / 127) * 0.35;
            torusMesh.scale.set(scale, scale, scale);
            setTimeout(() => torusMesh.scale.set(1,1,1), 150);

            let hue = Math.floor((note / 127) * 360);
            mat.color.setHSL(hue / 360, 0.8, 0.5);

            document.getElementById('keyDisplay').innerHTML = `Note: ${note} | Freq: ${freq.toFixed(1)}Hz | Velocity: ${vel}`;
            document.getElementById('plateLog').innerHTML = `Trigger Note ${note} // Freq ${freq.toFixed(1)}Hz active.`;
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
