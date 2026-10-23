const fs = require('fs');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA v34 // CHROMATIC AUDIO-REACTIVE DOCK</title>
    <style>
        :root {
            --bg-deep: #020b18;
            --panel-bg: #041428;
            --border-glow: #00d5ff;
            --text-cyan: #00d5ff;
            --text-muted: #88d5ff;
        }
        body {
            background: var(--bg-deep);
            color: var(--text-cyan);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        h1 {
            letter-spacing: 3px;
            font-size: 1.5rem;
            margin-bottom: 20px;
            text-shadow: 0 0 15px rgba(0,213,255,0.8);
            text-align: center;
        }
        .container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 20px;
            width: 100%;
            max-width: 1300px;
        }
        .panel {
            background: var(--panel-bg);
            border: 1px solid rgba(0, 136, 204, 0.7);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 25px rgba(0,213,255,0.2);
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .panel h3 {
            margin: 0 0 10px 0;
            font-size: 1.1rem;
            letter-spacing: 1px;
            border-bottom: 1px solid rgba(0,213,255,0.3);
            padding-bottom: 8px;
        }
        .canvas-container {
            width: 100%;
            height: 320px;
            background: #000;
            border-radius: 6px;
            position: relative;
            border: 1px solid rgba(0,213,255,0.5);
            overflow: hidden;
        }
        canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        .controls {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .control-group {
            background: rgba(0, 213, 255, 0.04);
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid rgba(0,213,255,0.15);
        }
        label {
            font-size: 0.85rem;
            display: flex;
            justify-content: space-between;
            color: var(--text-muted);
            margin-bottom: 6px;
        }
        input[type=range] {
            width: 100%;
            accent-color: var(--text-cyan);
            cursor: pointer;
        }
        button {
            background: linear-gradient(135deg, #0088cc, #00d5ff);
            color: #020b18;
            border: none;
            padding: 10px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            letter-spacing: 1px;
            transition: all 0.2s;
        }
        button:hover {
            opacity: 0.9;
            box-shadow: 0 0 10px rgba(0,213,255,0.8);
        }
        .status-bar {
            font-size: 0.8rem;
            font-family: monospace;
            background: #000;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid rgba(0,213,255,0.3);
            color: #33ff66;
        }
    </style>
</head>
<body>
    <h1>AROHA v34 // CHROMATIC AUDIO-REACTIVE DOCK</h1>
    <div class="container">
        <div class="panel">
            <h3>CHROMATIC CHLADNI VORTEX</h3>
            <div class="canvas-container">
                <canvas id="glCanvas"></canvas>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label>Wave Turbulence / Boom Depth: <span id="valDepth">65</span></label>
                    <input type="range" id="vortexRange" min="0" max="100" value="65">
                </div>
                <div class="control-group">
                    <label>MIDI / Audio Status</label>
                    <div id="midiStatus" class="status-bar">Initializing MIDI & Audio Engine...</div>
                </div>
            </div>
        </div>

        <div class="panel">
            <h3>12-CH SOLFEGGIO & AUDIO ENGINE</h3>
            <div class="controls">
                <button id="audioInitBtn">START CHROMATIC AUDIO ENGINE</button>
                <div class="control-group">
                    <label>Master Boom Volume: <span id="valVol">85</span>%</label>
                    <input type="range" id="masterVol" min="0" max="100" value="85">
                </div>
                <div class="control-group">
                    <label>Base Frequency (Solfeggio Resonance)</label>
                    <input type="range" id="freqRange" min="174" max="963" step="1" value="432">
                    <span style="font-size: 0.8rem; color: #00d5ff; display: block; margin-top: 4px;" id="freqVal">432 Hz (Biological Baseline)</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        let audioCtx = null;
        let analyser = null;
        let masterGain = null;
        let activeOscillator = null;
        let audioDataArray = new Uint8Array(128);

        document.getElementById("audioInitBtn").addEventListener("click", () => {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                
                masterGain = audioCtx.createGain();
                masterGain.gain.value = 0.85;

                masterGain.connect(analyser);
                analyser.connect(audioCtx.destination);

                startTone(432);
                document.getElementById("audioInitBtn").innerText = "CHROMATIC ENGINE ACTIVE";
                document.getElementById("audioInitBtn").style.background = "#33ff66";
            } else if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }
        });

        function startTone(freq) {
            if (activeOscillator) {
                activeOscillator.stop();
                activeOscillator.disconnect();
            }
            activeOscillator = audioCtx.createOscillator();
            activeOscillator.type = "sine";
            activeOscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            activeOscillator.connect(masterGain);
            activeOscillator.start();
        }

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
        } else {
            document.getElementById("midiStatus").innerText = "Web MIDI not supported.";
        }

        function onMIDISuccess(midiAccess) {
            document.getElementById("midiStatus").innerText = "MIDI Ready: Oxygen 61 Connected";
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = getMIDIMessage;
            }
        }

        function onMIDIFailure() {
            document.getElementById("midiStatus").innerText = "Could not access MIDI.";
        }

        function getMIDIMessage(message) {
            let [command, note, velocity] = message.data;
            if (command === 144 && velocity > 0) {
                let freq = 440 * Math.pow(2, (note - 69) / 12);
                if (audioCtx) {
                    startTone(freq);
                    document.getElementById("freqVal").innerText = \`\${freq.toFixed(1)} Hz (MIDI Note \${note})\`;
                }
            }
        }

        const canvas = document.getElementById("glCanvas");
        const gl = canvas.getContext("webgl");
        if (!gl) alert("WebGL not supported!");

        const vsSource = "attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }";
        const fsSource = \`
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_vortex_depth;
            uniform float u_audio_boost;
            #define PI 3.14159265359
            float chladni(vec2 p, float m, float n) {
                return sin(n * PI * p.x / 2.0) * sin(m * PI * p.y / 2.0) + sin(m * PI * p.x / 2.0) * sin(n * PI * p.y / 2.0);
            }
            void main() {
                vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
                float r = length(st);
                float theta = atan(st.y, st.x);
                
                float dynamicDepth = u_vortex_depth * (1.0 + u_audio_boost * 1.5);
                float wave = chladni(st * (2.0 + dynamicDepth * 0.02), 4.0, 6.0);
                float spiral = sin(r * 12.0 - u_time * 2.0 + theta * 3.0 + u_audio_boost * 3.0);
                
                float pattern = smoothstep(-0.06, 0.06, abs(wave + spiral * (0.2 + u_audio_boost * 0.3)) - 0.02);
                
                vec3 colDeep = vec3(0.02, 0.15, 0.3);
                vec3 colCyan = vec3(0.0, 0.84, 1.0);
                vec3 colMagenta = vec3(0.9, 0.1, 0.8);
                vec3 colGold = vec3(1.0, 0.8, 0.1);
                
                vec3 activeColor = mix(colCyan, colMagenta, clamp(u_audio_boost * 2.0, 0.0, 1.0));
                activeColor = mix(activeColor, colGold, clamp((u_audio_boost - 0.5) * 2.0, 0.0, 1.0));
                
                vec3 color = mix(colDeep, activeColor * (1.0 + u_audio_boost * 1.5), 1.0 - pattern);
                
                gl_FragColor = vec4(color, 1.0);
            }
        \`;

        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        }

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, "a_position");
        const timeLoc = gl.getUniformLocation(program, "u_time");
        const resLoc = gl.getUniformLocation(program, "u_resolution");
        const vortexLoc = gl.getUniformLocation(program, "u_vortex_depth");
        const audioBoostLoc = gl.getUniformLocation(program, "u_audio_boost");

        function render(time) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.enableVertexAttribArray(posLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            let audioLevel = 0.1;
            if (analyser) {
                analyser.getByteFrequencyData(audioDataArray);
                let sum = 0;
                for(let i = 0; i < audioDataArray.length; i++) {
                    sum += audioDataArray[i];
                }
                audioLevel = (sum / audioDataArray.length) / 255.0;
            }

            const depthVal = parseFloat(document.getElementById("vortexRange").value);

            gl.uniform1f(timeLoc, time * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            gl.uniform1f(vortexLoc, depthVal);
            gl.uniform1f(audioBoostLoc, audioLevel);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        document.getElementById("vortexRange").addEventListener("input", (e) => {
            document.getElementById("valDepth").innerText = e.target.value;
        });
        document.getElementById("masterVol").addEventListener("input", (e) => {
            const val = e.target.value;
            document.getElementById("valVol").innerText = val;
            if (masterGain && audioCtx) {
                masterGain.gain.setTargetAtTime(val / 100.0, audioCtx.currentTime, 0.05);
            }
        });
        document.getElementById("freqRange").addEventListener("input", (e) => {
            const val = e.target.value;
            document.getElementById("freqVal").innerText = \`\${val} Hz (Resonance)\`;
            if (activeOscillator && audioCtx) {
                activeOscillator.frequency.setTargetAtTime(parseFloat(val), audioCtx.currentTime, 0.05);
            }
        });
    </script>
</body>
</html>`;

if (!(fs.existsSync('public'))) { fs.mkdirSync('public'); }
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully wrote standalone index.html to public folder.');