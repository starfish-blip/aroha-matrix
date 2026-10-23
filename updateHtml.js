const fs = require('fs');
const html = `<!DOCTYPE html>
<html>
<head>
    <title>AROHA v34 // CONTROL DOCK</title>
    <style>
        body { background: #020b18; color: #00d5ff; font-family: sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        h1 { letter-spacing: 2px; font-size: 1.5rem; margin-bottom: 20px; text-shadow: 0 0 10px rgba(0,213,255,0.5); }
        .container { display: flex; gap: 20px; width: 100%; max-width: 1200px; flex-wrap: wrap; }
        .panel { background: #041428; border: 1px solid #0088cc; padding: 20px; border-radius: 8px; flex: 1; min-width: 300px; box-shadow: 0 0 15px rgba(0,213,255,0.2); }
        .canvas-container { width: 100%; height: 320px; background: #000; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid #00d5ff44; }
        canvas { width: 100%; height: 100%; display: block; }
        .controls { margin-top: 15px; display: flex; flex-direction: column; gap: 12px; }
        label { font-size: 0.85rem; display: flex; justify-content: space-between; color: #88d5ff; }
        input[type=range] { width: 100%; accent-color: #00d5ff; cursor: pointer; }
    </style>
</head>
<body>
    <h1>AROHA v34 // CONTROL DOCK ACTIVE</h1>
    <div class="container">
        <div class="panel">
            <h3>CYMATIC MAP (CHLADNI VORTEX)</h3>
            <div class="canvas-container">
                <canvas id="glCanvas"></canvas>
            </div>
            <div class="controls">
                <label>Vortex Depth: <span id="valDepth">50</span></label>
                <input type="range" id="vortexRange" min="0" max="100" value="50">
            </div>
        </div>
        <div class="panel">
            <h3>AUDIO ENGINE (12-CH SOLFEGGIO)</h3>
            <div class="controls">
                <label>Master Volume: <span id="valVol">80</span>%</label>
                <input type="range" id="masterVol" min="0" max="100" value="80">
            </div>
        </div>
    </div>
    <script>
        const canvas = document.getElementById('glCanvas');
        const gl = canvas.getContext('webgl');
        if (!gl) alert('WebGL not supported!');

        const vsSource = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';
        const fsSource = `
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_vortex_depth;
            #define PI 3.14159265359
            float chladni(vec2 p, float m, float n) {
                return sin(n * PI * p.x / 2.0) * sin(m * PI * p.y / 2.0) + sin(m * PI * p.x / 2.0) * sin(n * PI * p.y / 2.0);
            }
            void main() {
                vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
                float r = length(st);
                float theta = atan(st.y, st.x);
                float wave = chladni(st * (2.0 + u_vortex_depth * 0.02), 4.0, 6.0);
                float spiral = sin(r * 12.0 - u_time * 1.5 + theta * 3.0);
                float pattern = smoothstep(-0.05, 0.05, abs(wave + spiral * 0.2) - 0.02);
                vec3 col1 = vec3(0.02, 0.15, 0.3);
                vec3 col2 = vec3(0.0, 0.84, 1.0);
                vec3 color = mix(col1, col2, 1.0 - pattern);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

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

        const posLoc = gl.getAttribLocation(program, 'a_position');
        const timeLoc = gl.getUniformLocation(program, 'u_time');
        const resLoc = gl.getUniformLocation(program, 'u_resolution');
        const vortexLoc = gl.getUniformLocation(program, 'u_vortex_depth');

        function render(time) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.enableVertexAttribArray(posLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(timeLoc, time * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            gl.uniform1f(vortexLoc, parseFloat(document.getElementById('vortexRange').value));

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        document.getElementById('vortexRange').addEventListener('input', (e) => {
            document.getElementById('valDepth').innerText = e.target.value;
        });
        document.getElementById('masterVol').addEventListener('input', (e) => {
            document.getElementById('valVol').innerText = e.target.value;
        });
    </script>
</body>
</html>`;
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated public/index.html');