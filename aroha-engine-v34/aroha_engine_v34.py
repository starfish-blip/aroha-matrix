import os
import time
import numpy as np
from scipy.io.wavfile import write
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AROHA Engine v34 Unified - 12-Octave WAV & Ion Torus", version="34.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "generated_audio")
os.makedirs(OUT_DIR, exist_ok=True)
SR = 44100

def _safe(name: str) -> str:
    return "".join(c if c.isalnum() or c in ("_", "-", ".") else "_" for c in name)

class SynthRequest(BaseModel):
    mode: str = "binaural"
    start_hz: float = 108.0
    end_hz: float = 432.0
    beat_hz: float = 6.0
    duration: float = 10.0
    gains: list[float] = [1.0, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05, 0.0, 0.0, 0.0, 0.0]

@app.post("/api/gen")
def generate_wav(req: SynthRequest):
    dur = max(1.0, min(60.0, req.duration))
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    fade = int(SR * 0.05)
    env = np.ones_like(t)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)
    stamp = int(time.time())

    if req.mode == "chladni":
        k = (req.end_hz / max(1.0, req.start_hz)) ** (1.0 / dur)
        phase = 2 * np.pi * req.start_hz * ((k ** t - 1) / np.log(k)) if abs(k - 1.0) > 1e-6 else 2 * np.pi * req.start_hz * t
        wav = np.sin(phase) * env
        fn = _safe(f"chladni_{int(req.start_hz)}_{int(req.end_hz)}Hz_{stamp}.wav")
        write(os.path.join(OUT_DIR, fn), SR, np.int16(wav * 32767 * 0.9))
    elif req.mode == "iso":
        carrier = np.sin(2 * np.pi * req.start_hz * t)
        lfo = 0.5 * (1.0 + np.sign(np.sin(2 * np.pi * req.beat_hz * t)))
        wav = carrier * lfo * env
        fn = _safe(f"iso_{int(req.start_hz)}Hz_{req.beat_hz}Hz_{stamp}.wav")
        write(os.path.join(OUT_DIR, fn), SR, np.int16(wav * 32767 * 0.9))
    elif req.mode == "octave12":
        mix = np.zeros_like(t)
        for i, g in enumerate(req.gains[:12]):
            f = req.start_hz * (2 ** i)
            if g > 0 and f < (SR * 0.48):
                mix += g * np.sin(2 * np.pi * f * t)
        if np.max(np.abs(mix)) > 0:
            mix = mix / np.max(np.abs(mix))
        mix *= env
        fn = _safe(f"octave12_root{int(req.start_hz)}Hz_{stamp}.wav")
        write(os.path.join(OUT_DIR, fn), SR, np.int16(mix * 32767 * 0.85))
    else:
        left = np.sin(2 * np.pi * req.start_hz * t) * env
        right = np.sin(2 * np.pi * (req.start_hz + req.beat_hz) * t) * env
        stereo = np.column_stack((left, right))
        fn = _safe(f"binaural_{int(req.start_hz)}Hz_beat{req.beat_hz}Hz_{stamp}.wav")
        write(os.path.join(OUT_DIR, fn), SR, np.int16(stereo * 32767 * 0.85))

    return JSONResponse({"status": "ok", "file": fn, "url": f"/api/audio/{fn}"})

@app.get("/api/audio/{fn}")
def serve_wav(fn: str):
    path = os.path.join(OUT_DIR, _safe(fn))
    if not os.path.exists(path):
        return JSONResponse({"detail": "File not found"}, status_code=404)
    return FileResponse(path, media_type="audio/wav", filename=_safe(fn))

@app.get("/", response_class=HTMLResponse)
def dashboard():
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>AROHA v34 Unified — 12-Octave WAV & Ion Torus</title>
<script type="importmap">{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }</script>
<style>
  body{margin:0;background:#05060a;color:#0ff;font-family:Consolas,monospace;overflow:hidden}
  #c{position:fixed;inset:0;z-index:1}
  #ui{position:fixed;top:12px;left:12px;z-index:10;width:390px;background:rgba(6,10,18,0.92);border:1px solid #0ff;border-radius:10px;padding:14px}
  h2{margin:0 0 8px;font-size:14px} label{display:block;font-size:11px;margin-top:6px}
  input,select,button{width:100%;box-sizing:border-box;background:#0b101b;color:#0ff;border:1px solid #0aa;border-radius:5px;padding:6px;margin-top:4px;font-family:inherit}
  button{cursor:pointer;font-weight:bold} button:hover{background:#0ff;color:#000}
  .row{display:flex;gap:5px;margin-top:6px} .row button{font-size:10px;padding:5px}
  audio{width:100%;margin-top:10px}
</style></head><body>
<canvas id="c"></canvas>
<div id="ui">
  <h2>AROHA ENGINE v34 // WAV + ION TORUS</h2>
  <div class="row">
    <button onclick="setCosmo(0x00ffff, 1.0)">TORUS</button>
    <button onclick="setCosmo(0xffaa44, 1.4)">NORSE</button>
    <button onclick="setCosmo(0xaa66ff, 1.8)">VEDIC</button>
    <button onclick="setCosmo(0x44ff99, 2.2)">ENOCH</button>
  </div>
  <label>Synthesis Mode
    <select id="mode">
      <option value="binaural">Stereo Binaural WAV (Monroe FFR)</option>
      <option value="octave12">12-Octave Harmonic Stack (2^n)</option>
      <option value="chladni">Logarithmic Chladni Frequency Sweep</option>
      <option value="iso">Isochronic Pulse Train</option>
    </select>
  </label>
  <label>Root / Start Frequency (Hz)<input id="sHz" type="number" value="216"/></label>
  <label>End Sweep Frequency (Hz)<input id="eHz" type="number" value="432"/></label>
  <label>Binaural / Iso Beat (Hz)<input id="bHz" type="number" value="6.0" step="0.5"/></label>
  <label>Duration (seconds)<input id="dur" type="number" value="12"/></label>
  <button onclick="renderWav()" style="margin-top:10px">GENERATE 44.1kHz WAV</button>
  <div id="status" style="font-size:11px;margin-top:8px;color:#4df097">Ready.</div>
  <audio id="player" controls></audio>
</div>
<script type="module">
import * as THREE from 'three';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 5.5;
const geo = new THREE.TorusKnotGeometry(1.5, 0.42, 220, 32, 2, 3);
const mat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.03 });
const mesh = new THREE.Points(geo, mat);
scene.add(mesh);
let speed = 1.0;
window.setCosmo = (hex, spd) => { mat.color.setHex(hex); speed = spd; };
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
function anim(t){ requestAnimationFrame(anim); mesh.rotation.y = t * 0.0004 * speed; mesh.rotation.x = t * 0.0002 * speed; renderer.render(scene, camera); }
requestAnimationFrame(anim);

window.renderWav = async () => {
  document.getElementById('status').textContent = 'Synthesizing 16-bit WAV...';
  const res = await fetch('/api/gen', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      mode: document.getElementById('mode').value,
      start_hz: parseFloat(document.getElementById('sHz').value),
      end_hz: parseFloat(document.getElementById('eHz').value),
      beat_hz: parseFloat(document.getElementById('bHz').value),
      duration: parseFloat(document.getElementById('dur').value)
    })
  });
  const data = await res.json();
  document.getElementById('status').innerHTML = 'Saved: <a style="color:#ffb86a" href="'+data.url+'" download>'+data.file+'</a>';
  const p = document.getElementById('player'); p.src = data.url; p.play();
};
</script></body></html>"""