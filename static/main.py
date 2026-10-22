from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Engine v34: Modular Matrix</title>
    <style>
        body { background: #0a0c10; color: #00ffcc; font-family: sans-serif; margin: 0; padding: 15px; }
        header { padding: 10px; border-bottom: 1px solid rgba(0,255,204,0.2); margin-bottom: 15px; }
        h2 { margin: 0; letter-spacing: 2px; }
        .grid { display: flex; gap: 15px; }
        .panel { background: rgba(15, 20, 28, 0.9); border: 1px solid rgba(0,255,204,0.3); border-radius: 6px; padding: 15px; flex: 1; }
        canvas { display: block; background: #05070a; border: 1px solid rgba(0,255,204,0.2); width: 100%; height: 280px; border-radius: 4px; }
        h3 { margin-top: 0; font-size: 14px; }
        p { font-size: 12px; color: #88b3cc; }
    </style>
</head>
<body>
    <header>
        <h2>AROHA ENGINE v34 // LIVE MATRIX</h2>
    </header>
    <div class="grid">
        <div class="panel">
            <h3>CYMATIC PLATE // RESONANCE MAP</h3>
            <canvas id="cymaticCanvas"></canvas>
        </div>
        <div class="panel">
            <h3>12-OCTAVE FADER BANK</h3>
            <p>OXYGEN 61 // AUTO-MAPPED</p>
        </div>
        <div class="panel">
            <h3>TOROIDAL FIELD // EMITTER</h3>
            <canvas id="torusCanvas"></canvas>
        </div>
    </div>
    <script>
        const cymCanvas = document.getElementById('cymaticCanvas');
        const ctx1 = cymCanvas.getContext('2d');
        function drawCymatic() {
            const w = cymCanvas.width = cymCanvas.clientWidth || 400;
            const h = cymCanvas.height = cymCanvas.clientHeight || 280;
            const t = Date.now() * 0.002;
            ctx1.fillStyle = '#05070a';
            ctx1.fillRect(0, 0, w, h);
            ctx1.beginPath();
            ctx1.strokeStyle = '#00ffcc';
            ctx1.lineWidth = 2;
            const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35;
            for (let a = 0; a < Math.PI * 2; a += 0.02) {
                const wave = Math.sin(a * 8 + t) * 15;
                const radius = r + wave;
                const x = cx + Math.cos(a) * radius;
                const y = cy + Math.sin(a) * radius;
                if (a === 0) ctx1.moveTo(x, y); else ctx1.lineTo(x, y);
            }
            ctx1.closePath();
            ctx1.stroke();
            requestAnimationFrame(drawCymatic);
        }
        drawCymatic();

        const torCanvas = document.getElementById('torusCanvas');
        const ctx2 = torCanvas.getContext('2d');
        function drawTorus() {
            const w = torCanvas.width = torCanvas.clientWidth || 400;
            const h = torCanvas.height = torCanvas.clientHeight || 280;
            const t = Date.now() * 0.001;
            ctx2.fillStyle = '#05070a';
            ctx2.fillRect(0, 0, w, h);
            ctx2.beginPath();
            ctx2.strokeStyle = '#00ffee';
            ctx2.lineWidth = 1.5;
            const cx = w / 2, cy = h / 2;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + t * 0.3;
                const rx = 60 + Math.sin(t + i) * 20;
                const ry = 120 + Math.cos(t * 0.5) * 30;
                ctx2.save();
                ctx2.translate(cx, cy);
                ctx2.rotate(angle);
                ctx2.beginPath();
                ctx2.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx2.stroke();
                ctx2.restore();
            }
            requestAnimationFrame(drawTorus);
        }
        drawTorus();
    </script>
</body>
</html>
    """