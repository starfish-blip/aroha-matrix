import os, time
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from scipy.io.wavfile import write

app = FastAPI(title="Aroha v25 Master", version="25.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
OUT_DIR="generated_audio"; os.makedirs(OUT_DIR, exist_ok=True); SR=44100
def _safe(n): return "".join(c if c.isalnum() or c in ("_","-",".") else "_" for c in n)
def synth_chladni(sf, ef, dur, fn):
    t=np.linspace(0,dur,int(SR*dur),endpoint=False)
    k=(ef/sf)**(1.0/dur); phase=2*np.pi*sf*((k**t-1)/np.log(k)); wav=np.sin(phase)
    fade=int(SR*0.05); env=np.ones_like(wav); env[:fade]=np.linspace(0,1,fade); env[-fade:]=np.linspace(1,0,fade)
    wav*=env; p=os.path.join(OUT_DIR,_safe(fn)); write(p,SR,np.int16(wav*32767*0.9)); return p
def synth_binaural(car, beat, dur, fn):
    t=np.linspace(0,dur,int(SR*dur),endpoint=False)
    left=np.sin(2*np.pi*car*t); right=np.sin(2*np.pi*(car+beat)*t)
    fade=int(SR*0.1); env=np.ones_like(t); env[:fade]=np.linspace(0,1,fade); env[-fade:]=np.linspace(1,0,fade)
    left*=env; right*=env; stereo=np.column_stack((left,right))
    p=os.path.join(OUT_DIR,_safe(fn)); write(p,SR,np.int16(stereo*32767*0.8)); return p
def synth_iso(base, pulse, dur, fn):
    t=np.linspace(0,dur,int(SR*dur),endpoint=False)
    carrier=np.sin(2*np.pi*base*t); lfo=0.5*(1+np.sign(np.sin(2*np.pi*pulse*t)))
    wav=carrier*lfo; fade=int(SR*0.05); env=np.ones_like(wav); env[:fade]=np.linspace(0,1,fade); env[-fade:]=np.linspace(1,0,fade)
    wav*=env; p=os.path.join(OUT_DIR,_safe(fn)); write(p,SR,np.int16(wav*32767*0.9)); return p

@app.get("/", response_class=HTMLResponse)
def dash():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AROHA v25 Master - Split Screen & Matter States</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
<script type="importmap">{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }</script>
<style>
 html,body{margin:0;padding:0;background:#000;overflow:hidden;width:100%;height:100%;font-family:monospace;color:#0ff}
 #c{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1;display:block}
 #flower{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;height:520px;pointer-events:none;opacity:0.18;z-index:5}
 #ui{position:fixed;top:10px;left:10px;z-index:20;width:490px;max-height:97vh;overflow-y:auto;background:rgba(0,0,0,0.95);border:1px solid #0ff;border-radius:10px;padding:12px;box-shadow:0 0 50px rgba(0,255,255,0.4)}
 h2{margin:0 0 6px 0;font-size:14px;letter-spacing:2px} h3{margin:10px 0 4px 0;font-size:11px;color:#5ff}
 label{display:block;margin-top:6px;font-size:10px} input,select{width:100%;background:#080808;color:#0ff;border:1px solid #0ff;border-radius:4px;padding:5px;margin-top:2px;font-family:monospace;box-sizing:border-box}
 button{width:100%;background:#0a0a0a;color:#0ff;border:1px solid #0ff;border-radius:5px;padding:7px;margin-top:6px;font-weight:bold;cursor:pointer;font-family:monospace}
 button:hover{background:#0ff;color:#000}
 .row{display:flex;gap:5px} .row button{flex:1}
 .tab{display:flex;gap:4px;margin-bottom:8px} .tab button{flex:1;margin:0;font-size:10px;padding:6px}
 .tab button.active{background:#0ff;color:#000}
 .panel{display:none} .panel.active{display:block}
 canvas#spec{width:100%;height:50px;background:#050505;border:1px solid #033;border-radius:4px;margin-top:6px}
 canvas#keys{width:100%;height:60px;background:#080808;border:1px solid #033;border-radius:4px;margin-top:6px}
 .status{margin-top:6px;font-size:10px;color:#0f0;border-top:1px dashed #0ff;padding-top:5px;word-break:break-all;min-height:14px}
 .small{font-size:9px;color:#6ff;margin-top:4px;line-height:1.3}
 .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
</style>
</head>
<body>
<canvas id="c"></canvas>
<canvas id="flower"></canvas>
<div id="ui">
<h2>AROHA v25 MASTER - FULL SPECTRUM</h2>
<div class="tab">
 <button id="tb-live" class="active" onclick="setTab('live')">LIVE KEYS</button>
 <button id="tb-sweep" onclick="setTab('sweep')">SWEEP GEN</button>
 <button id="tb-samp" onclick="setTab('samp')">SAMPLER</button>
</div>

<div id="p-live" class="panel active">
 <h3>Instrument & Matter States</h3>
 <div class="grid2">
  <label>Voice Mode<select id="voiceMode"><option value="pure" selected>Pure Tone</option><option value="binaural">Binaural Pair</option><option value="iso">Iso Pulse</option><option value="sampler">Wav Sampler</option></select></label>
  <label>Matter State<select id="matMode">
    <option value="solid">Solid (Sand Nodes)</option>
    <option value="liquid" selected>Liquid (Surface Waves)</option>
    <option value="gas">Gas (Vapor Dispersion)</option>
    <option value="crystal">Crystal (Plasma Lattice)</option>
  </select></label>
 </div>
 <div class="grid2">
  <label>Viewport Layout<select id="viewMode" onchange="updateViewMode()">
    <option value="combined" selected>Combined View</option>
    <option value="split">Split-Screen Dual View</option>
    <option value="fullscreen">Fullscreen Immersive</option>
  </select></label>
  <label>Waveform<select id="waveType"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="sawtooth">Saw</option><option value="square">Square</option></select></label>
 </div>
 <div class="grid2">
  <label>Toroid Knot P<input id="knotP" type="number" value="2" min="1" max="6"></label>
  <label>Toroid Knot Q<input id="knotQ" type="number" value="3" min="1" max="8"></label>
 </div>
 <div class="grid2">
  <label>Bend Range<input id="bendRange" type="range" min="1" max="24" value="2"></label>
  <label>Master Filter<input id="filt" type="range" min="200" max="12000" value="9000"></label>
 </div>
 <canvas id="keys"></canvas>
 <div class="small">Oxygen 61 active. Pitch wheel bends, ModWheel turbulence.</div>
</div>

<div id="p-sweep" class="panel">
 <h3>Sweep & Cymatic Patterns</h3>
 <label>Harmonic Ratio n:m
  <select id="c_ratio"><option value="3,5">3:5 Theta water circles</option><option value="4,5" selected>4:5 Alpha grid</option><option value="5,8">5:8 Golden sand branches</option><option value="8,13">8:13 Gateway crystal lattice</option></select>
 </label>
 <label>Landscape Environment
  <select id="env"><option value="grid">Cyber Grid Terrain</option><option value="deep">Deep Space Void</option><option value="matrix">Matrix Starfield</option><option value="crystal">Crystal Chamber</option></select>
 </label>
 <div class="grid2"><label>Start Hz<input id="c_start" type="number" value="108"><label>End Hz<input id="c_end" type="number" value="1080"></label></div>
 <label>Duration<input id="c_dur" type="number" value="15"></label>
 <button onclick="genFile('chladni')">Generate & Play Chladni Sweep</button>
</div>

<div id="p-samp" class="panel">
 <h3>Wav Sampler</h3>
 <label>Load Custom Wavs<input id="fileIn" type="file" accept=".wav,.mp3,.ogg" multiple></label>
 <div id="sampleList" class="small">No samples loaded.</div>
 <label>Assign Sample<select id="sampleSelect"></select></label>
 <div class="row"><button onclick="clearSamples()">Clear Samples</button><button onclick="setTab('live')">Back to Live</button></div>
</div>

<div class="row"><button onclick="toggleAuto()">Auto Ratio Cycle</button><button onclick="snap()">Snapshot PNG</button><button id="dlBtn" style="display:none" onclick="dl()">Download WAV</button></div>
<canvas id="spec" width="470" height="50"></canvas>
<div id="status" class="status">v25 Master active - Split screen & matter physics loaded.</div>
</div>

<script type="module">
import * as THREE from 'three';
const statusEl=document.getElementById('status');
function log(m){ statusEl.innerText=m; console.log(m); }

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x020208); scene.fog=new THREE.FogExp2(0x000000,0.025);
const camera=new THREE.PerspectiveCamera(68, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,16,30); camera.lookAt(0,2,0);
const light=new THREE.PointLight(0x00ffff, 2, 120); light.position.set(10,20,10); scene.add(light);

// Cymatic Plate
const plateGeo=new THREE.PlaneGeometry(32,32,100,100);
const plateMat=new THREE.MeshBasicMaterial({color:0x00ffff, wireframe:true});
const plate=new THREE.Mesh(plateGeo, plateMat); plate.rotation.x=-Math.PI/2.15; plate.position.set(-8,-1,0); scene.add(plate);

// Toroidal Field
let knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32, 2, 3);
const knotMat=new THREE.MeshBasicMaterial({color:0xff00ff, wireframe:true});
const torusKnot=new THREE.Mesh(knotGeo, knotMat); torusKnot.position.set(10,6,-4); scene.add(torusKnot);

const torusGeo=new THREE.TorusGeometry(8,0.6,16,100);
const torusMat=new THREE.MeshBasicMaterial({color:0x00ff88, wireframe:true, transparent:true, opacity:0.6});
const torus=new THREE.Mesh(torusGeo, torusMat); torus.position.set(10,6,-4); torus.rotation.x=Math.PI/2; scene.add(torus);

// Terrain & Stars
const terrainGeo=new THREE.PlaneGeometry(140,140,40,40);
const terrainMat=new THREE.MeshBasicMaterial({color:0x003344, wireframe:true});
const terrain=new THREE.Mesh(terrainGeo, terrainMat); terrain.rotation.x=-Math.PI/2; terrain.position.set(0,-10,-10); scene.add(terrain);

const starGeo=new THREE.BufferGeometry(); const starCount=1200; const starPos=new Float32Array(starCount*3);
for(let i=0;i<starCount*3;i++) starPos[i]=(Math.random()-0.5)*200;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
const starMat=new THREE.PointsMaterial({color:0x00ffff, size:0.4});
const stars=new THREE.Points(starGeo, starMat); stars.visible=false; scene.add(stars);

const posAttr=plateGeo.attributes.position;
const spec=document.getElementById('spec'); const sctx=spec.getContext('2d');
const keysCanvas=document.getElementById('keys'); const kctx=keysCanvas.getContext('2d');
const flower=document.getElementById('flower'); const fctx=flower.getContext('2d');
let audioCtx, analyser, filter, masterGain, dataArray;
let voices=new Map(); let curFileAudio=null; let isFilePlaying=false;
let timeAcc=0, n=4,m=5, turb=1, timeStretch=1, hueBase=180, bend=0, panCC=0;
let lastUrl="", lastName="", auto=false, autoInt=null;
let sampleBuffers=new Map();

function drawFlower(h){
 const w=flower.width=520,hgt=flower.height=520; fctx.clearRect(0,0,w,hgt);
 fctx.strokeStyle=`hsla(${h},100%,60%,0.5)`; fctx.lineWidth=1;
 const R=40,cx=w/2,cy=hgt/2;
 for(let row=-3;row<=3;row++){ for(let col=-3;col<=3;col++){
   let x=cx+col*R*1.5, y=cy+row*R*Math.sqrt(3); if(col%2!==0) y+=R*Math.sqrt(3)/2;
   fctx.beginPath(); fctx.arc(x,y,R,0,Math.PI*2); fctx.stroke();
 }}
}
drawFlower(hueBase);

function initAudio(){
 if(!audioCtx){
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  analyser=audioCtx.createAnalyser(); analyser.fftSize=512;
  filter=audioCtx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=9000;
  masterGain=audioCtx.createGain(); masterGain.gain.value=0.75;
  filter.connect(analyser); analyser.connect(masterGain); masterGain.connect(audioCtx.destination);
  dataArray=new Uint8Array(analyser.frequencyBinCount);
 }
 if(audioCtx.state==='suspended') audioCtx.resume();
}
function midiToFreq(note){ return 440*Math.pow(2,(note-69)/12); }
function drawKeys(){
 const w=keysCanvas.width=keysCanvas.clientWidth*2, h=keysCanvas.height=60*2;
 kctx.clearRect(0,0,w,h); kctx.fillStyle='#111'; kctx.fillRect(0,0,w,h);
 let total=24; let keyW=w/total;
 for(let i=0;i<total;i++){ let midi=48+i; let isBlack=[1,3,6,8,10].includes(midi%12); let isOn=voices.has(midi); let hue=(midi*7)%360;
  if(isOn) kctx.fillStyle=`hsl(${hue},100%,60%)`; else kctx.fillStyle=isBlack?'#222':'#ddd';
  kctx.fillRect(i*keyW, isBlack?0:18, keyW-2, isBlack?36:h-18);
  if(isOn){ kctx.fillStyle='#fff'; kctx.fillRect(i*keyW, h-6, keyW-2, 6); }
 }
}
function updateVisualNote(note){
 hueBase=(note*7)%360;
 plateMat.color.setHSL(hueBase/360,1,0.55);
 knotMat.color.setHSL(((hueBase+180)%360)/360,1,0.5);
 terrainMat.color.setHSL(((hueBase+90)%360)/360,0.8,0.35);
 starMat.color.setHSL(hueBase/360,1,0.6);
 drawFlower(hueBase); drawKeys();
}
function createVoice(note, vel){
 initAudio();
 const mode=document.getElementById('voiceMode').value;
 const wave=document.getElementById('waveType').value;
 const freq=midiToFreq(note); const velGain=vel/127;
 let voice={oscs:[], gains:[], panners:[], baseFreq:freq};
 let osc=audioCtx.createOscillator(); osc.type=wave; osc.frequency.value=freq;
 let g=audioCtx.createGain(); g.gain.value=velGain*0.6;
 let p=audioCtx.createStereoPanner(); p.pan.value=0;
 osc.connect(g); g.connect(p); p.connect(filter); osc.start();
 voice.oscs=[osc]; voice.gains=[g]; voice.panners=[p];
 voices.set(note, voice); updateVisualNote(note); return voice;
}
function releaseVoice(note){
 let v=voices.get(note); if(!v) return;
 v.oscs.forEach(o=>{ try{o.stop();o.disconnect();}catch(e){} });
 voices.delete(note); drawKeys();
}

function updateKnotGeometry(){
 const p=parseInt(document.getElementById('knotP').value)||2;
 const q=parseInt(document.getElementById('knotQ').value)||3;
 scene.remove(torusKnot);
 knotGeo.dispose();
 knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32,p,q);
 torusKnot.geometry=knotGeo;
 scene.add(torusKnot);
}
document.getElementById('knotP').addEventListener('input', updateKnotGeometry);
document.getElementById('knotQ').addEventListener('input', updateKnotGeometry);

window.updateViewMode = function(){
 const mode=document.getElementById('viewMode').value;
 const ui=document.getElementById('ui');
 if(mode==='fullscreen'){ ui.style.display='none'; } else { ui.style.display='block'; }
};

function animate(){
 requestAnimationFrame(animate);
 timeAcc+=0.04*timeStretch;
 let amp=0;
 if(analyser){
  analyser.getByteFrequencyData(dataArray); let sum=0; for(let v of dataArray) sum+=v; amp=(sum/dataArray.length)/11;
  sctx.clearRect(0,0,spec.width,spec.height); let bw=spec.width/dataArray.length, x=0;
  for(let i=0;i<dataArray.length;i++){ let h=(dataArray[i]/255)*spec.height; sctx.fillStyle=`hsl(${180+dataArray[i]*0.4},100%,60%)`; sctx.fillRect(x,spec.height-h,bw,h); x+=bw+1; }
 }
 let matMode=document.getElementById('matMode').value;
 for(let i=0;i<posAttr.count;i++){
  let x=posAttr.getX(i), y=posAttr.getY(i); let z=0;
  if(matMode==='solid') z=Math.sin(n*x*0.2+timeAcc)*Math.cos(m*y*0.2+timeAcc)*(4+amp*3); // Sand nodes
  else if(matMode==='liquid') z=Math.sin(n*x*0.14+timeAcc)*Math.sin(m*y*0.14+timeAcc)*Math.cos((n+m)*0.05*timeAcc)*(5+amp*4); // Waves
  else if(matMode==='gas') z=(Math.random()-0.5)*amp*2 + Math.sin(x*0.1+timeAcc)*Math.cos(y*0.1+timeAcc)*2; // Vapor dispersion
  else z=(Math.sin(n*x*0.18)*Math.cos(m*y*0.18)+Math.sin(m*x*0.12)*Math.cos(n*y*0.12))*3.5*(1+amp*1.5); // Crystal lattice
  posAttr.setZ(i,z);
 }
 posAttr.needsUpdate=true; plate.rotation.z+=0.0015*timeStretch;
 torusKnot.rotation.x+=0.01*timeStretch; torusKnot.rotation.y+=0.014*timeStretch;
 let s=1+amp*0.8; torusKnot.scale.set(s,s,s); torus.scale.set(s,s,s);

 const vMode=document.getElementById('viewMode').value;
 renderer.clear();
 if(vMode==='split'){
  // Split viewport into left and right panes
  const w=window.innerWidth, h=window.innerHeight;
  renderer.setViewport(0, 0, w/2, h); renderer.setScissor(0, 0, w/2, h); renderer.setScissorTest(true);
  camera.position.set(-8, 12, 22); camera.lookAt(-8, 0, 0); renderer.render(scene, camera);
  renderer.setViewport(w/2, 0, w/2, h); renderer.setScissor(w/2, 0, w/2, h); renderer.setScissorTest(true);
  camera.position.set(10, 14, 25); camera.lookAt(10, 6, -4); renderer.render(scene, camera);
  renderer.setScissorTest(false);
 } else {
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  camera.position.set(0,16,30); camera.lookAt(0,2,0);
  renderer.render(scene, camera);
 }
}
animate();

if(navigator.requestMIDIAccess){
 navigator.requestMIDIAccess().then(m=>{
  for(let inp of m.inputs.values()) inp.onmidimessage=e=>{
   let st=e.data[0], d1=e.data[1], d2=e.data[2];
   if(st>=144&&st<=159&&d2>0) createVoice(d1,d2);
   else if((st>=128&&st<=143)||(st>=144&&st<=159&&d2===0)) releaseVoice(d1);
  };
 });
}
const qmap={a:60,s:62,d:64,f:65,g:67,h:69,j:71,k:72,l:74,';':76};
window.addEventListener('keydown', e=>{ if(qmap[e.key]&&!voices.has(qmap[e.key])) createVoice(qmap[e.key],100); });
window.addEventListener('keyup', e=>{ if(qmap[e.key]) releaseVoice(qmap[e.key]); });

window.setTab=t=>{
 document.querySelectorAll('.tab button').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
 document.getElementById('tb-'+t).classList.add('active'); document.getElementById('p-'+t).classList.add('active');
};
window.snap=()=>{ let u=renderer.domElement.toDataURL('image/png'); let a=document.createElement('a'); a.href=u; a.download=`aroha_v25_${Date.now()}.png`; a.click(); };
window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
</script>
</body>
</html>
    """

@app.get("/generate/chladni")
def gc(start_freq: float = 108, end_freq: float = 1080, duration: float = 12):
    fn=f"chladni_{int(start_freq)}_{int(end_freq)}_{int(time.time())}.wav"
    return FileResponse(synth_chladni(start_freq,end_freq,duration,fn), media_type="audio/wav", filename=fn)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
