import os, time
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from scipy.io.wavfile import write

app = FastAPI(title="Aroha v29 Draggable Workstation", version="29.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
OUT_DIR="generated_audio"; os.makedirs(OUT_DIR, exist_ok=True); SR=44100

def _safe(n): return "".join(c if c.isalnum() or c in ("_","-",".") else "_" for c in n)

def synth_chladni(sf, ef, dur, fn):
    t=np.linspace(0,dur,int(SR*dur),endpoint=False)
    k=(ef/sf)**(1.0/dur); phase=2*np.pi*sf*((k**t-1)/np.log(k)); wav=np.sin(phase)
    fade=int(SR*0.05); env=np.ones_like(wav); env[:fade]=np.linspace(0,1,fade); env[-fade:]=np.linspace(1,0,fade)
    wav*=env; p=os.path.join(OUT_DIR,_safe(fn)); write(p,SR,np.int16(wav*32767*0.9)); return p

@app.get("/", response_class=HTMLResponse)
def dash():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AROHA v29 - Draggable Workstation</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
<script type="importmap">{ "imports": { 
  "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
} }</script>
<style>
 html,body{margin:0;padding:0;background:#000;overflow:hidden;width:100%;height:100%;font-family:monospace;color:#0ff}
 #c{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1;display:block}
 #flower{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;height:520px;pointer-events:none;opacity:0.18;z-index:5}
 
 /* Draggable HUD Workstation Panel */
 #ui{position:fixed;top:20px;left:20px;z-index:20;width:480px;max-height:94vh;overflow-y:auto;background:rgba(5,5,15,0.88);backdrop-filter:blur(12px);border:1px solid rgba(0,255,255,0.5);border-radius:12px;padding:12px;box-shadow:0 0 50px rgba(0,255,255,0.25);cursor:default;}
 #ui-header{padding:4px 0 10px 0;cursor:grab;font-weight:bold;color:#fff;border-bottom:1px dashed #0ff;display:flex;justify-content:space-between;align-items:center;}
 #ui-header:active{cursor:grabbing;}
 #ui.collapsed{transform:scale(0.95);opacity:0;pointer-events:none;}

 #toggle-ui{position:fixed;top:15px;right:15px;z-index:25;background:rgba(0,0,0,0.85);color:#0ff;border:1px solid #0ff;padding:8px 14px;border-radius:6px;cursor:pointer;font-family:monospace;font-weight:bold;box-shadow:0 0 15px rgba(0,255,255,0.3);}
 #toggle-ui:hover{background:#0ff;color:#000;}

 h2{margin:0;font-size:13px;letter-spacing:2px;text-shadow:0 0 8px #0ff;}
 .tab{display:flex;gap:3px;margin:10px 0;}
 .tab button{flex:1;margin:0;font-size:9px;padding:6px 2px;background:#0a0a0a;color:#0ff;border:1px solid #0ff;border-radius:4px;cursor:pointer;font-family:monospace;font-weight:bold}
 .tab button.active{background:#0ff;color:#000}
 .panel{display:none} .panel.active{display:block}
 label{display:block;margin-top:5px;font-size:10px;color:#8ff} input,select{width:100%;background:#080808;color:#0ff;border:1px solid #0ff;border-radius:4px;padding:4px;margin-top:2px;font-family:monospace;box-sizing:border-box}
 button.action{width:100%;background:#0a0a0a;color:#0ff;border:1px solid #0ff;border-radius:5px;padding:6px;margin-top:6px;font-weight:bold;cursor:pointer;font-family:monospace}
 button.action:hover{background:#0ff;color:#000}
 canvas#spec{width:100%;height:45px;background:#050505;border:1px solid #033;border-radius:4px;margin-top:6px}
 canvas#keys{width:100%;height:60px;background:#080808;border:1px solid #033;border-radius:4px;margin-top:6px;cursor:pointer}
 .status{margin-top:5px;font-size:9px;color:#0f0;border-top:1px dashed #0ff;padding-top:4px;word-break:break-all;min-height:12px}
 .grid2{display:grid;grid-template-columns:1fr 1fr;gap:5px}
 .small{font-size:9px;color:#6ff;margin-top:3px}
</style>
</head>
<body>
<button id="toggle-ui" onclick="toggleUI()">[H] Toggle HUD</button>
<canvas id="c"></canvas>
<canvas id="flower"></canvas>

<div id="ui">
 <div id="ui-header">
  <span>AROHA v29 - WORKSTATION</span>
  <span style="font-size:10px;color:#8ff;">[Click & Drag Header]</span>
 </div>
 <div class="tab">
  <button id="tb-live" class="active" onclick="setTab('live')">INSTRUMENT</button>
  <button id="tb-geo" onclick="setTab('geo')">3D GEOMETRY</button>
  <button id="tb-samp" onclick="setTab('samp')">SAMPLER</button>
  <button id="tb-sweep" onclick="setTab('sweep')">SWEEP GEN</button>
 </div>

 <div id="p-live" class="panel active">
  <div class="grid2">
   <label>Voice Mode<select id="voiceMode"><option value="pure" selected>Pure Tone</option><option value="sampler">Wav Sampler</option></select></label>
   <label>Tuning Matrix<select id="tuningMode">
    <option value="eq" selected>Equal Temperament</option>
    <option value="just">Just Intonation</option>
    <option value="432">432Hz Harmonic</option>
    <option value="528">528Hz Solfeggio</option>
   </select></label>
  </div>
  <div class="grid2">
   <label>Waveform<select id="waveType"><option value="sine" selected>Sine</option><option value="triangle">Triangle</option><option value="sawtooth">Saw</option><option value="square">Square</option></select></label>
   <label>Master Filter<input id="filt" type="range" min="200" max="12000" value="9000"></label>
  </div>
  <label>Interactive & MIDI Keyboard (Click keys or play Oxygen 61)</label>
  <canvas id="keys"></canvas>
  <button class="action" onclick="clearAllVoices()">Release All Voices</button>
 </div>

 <div id="p-geo" class="panel">
  <label>Matter State
   <select id="matMode">
    <option value="solid">Solid (Sand Nodes)</option>
    <option value="liquid" selected>Liquid (Surface Waves)</option>
    <option value="gas">Gas (Vapor Dispersion)</option>
    <option value="crystal">Crystal (Plasma Lattice)</option>
   </select>
  </label>
  <div class="grid2">
   <label>Toroid Knot P<input id="knotP" type="number" value="2" min="1" max="6"></label>
   <label>Toroid Knot Q<input id="knotQ" type="number" value="3" min="1" max="8"></label>
  </div>
  <div class="small">Click & drag with mouse in 3D space to orbit around the chord stack and toroidal field.</div>
 </div>

 <div id="p-samp" class="panel">
  <label>Load Custom Wavs<input id="fileIn" type="file" accept=".wav,.mp3,.ogg" multiple></label>
  <div id="sampleList" class="small">No samples loaded.</div>
  <label>Assign Sample<select id="sampleSelect"></select></label>
  <label>Root MIDI Note<input id="rootNote" type="number" value="60"></label>
 </div>

 <div id="p-sweep" class="panel">
  <div class="grid2"><label>Start Hz<input id="c_start" type="number" value="108"><label>End Hz<input id="c_end" type="number" value="1080"></label></div>
  <label>Duration sec<input id="c_dur" type="number" value="12"></label>
  <button class="action" onclick="genFile('chladni')">Generate & Play Chladni Sweep</button>
 </div>

 <canvas id="spec" width="460" height="45"></canvas>
 <div id="status" class="status">v29 Active - Drag header to move panel. Orbit controls enabled.</div>
</div>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const statusEl=document.getElementById('status');
function log(m){ statusEl.innerText=m; console.log(m); }

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x020208); scene.fog=new THREE.FogExp2(0x000000,0.025);
const camera=new THREE.PerspectiveCamera(68, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,18,32);

// Enable Full Mouse Orbit & Pan Controls in 3D Space
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const light=new THREE.PointLight(0x00ffff, 2, 120); light.position.set(10,20,10); scene.add(light);

// Toroidal Field
let knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32, 2, 3);
const knotMat=new THREE.MeshBasicMaterial({color:0xff00ff, wireframe:true});
const torusKnot=new THREE.Mesh(knotGeo, knotMat); torusKnot.position.set(10,6,-4); scene.add(torusKnot);

const torusGeo=new THREE.TorusGeometry(8,0.6,16,100);
const torusMat=new THREE.MeshBasicMaterial({color:0x00ff88, wireframe:true, transparent:true, opacity:0.6});
const torus=new THREE.Mesh(torusGeo, torusMat); torus.position.set(10,6,-4); torus.rotation.x=Math.PI/2; scene.add(torus);

const spec=document.getElementById('spec'); const sctx=spec.getContext('2d');
const keysCanvas=document.getElementById('keys'); const kctx=keysCanvas.getContext('2d');
let audioCtx, analyser, filter, masterGain, dataArray;
let voices=new Map(); let sampleBuffers=new Map();
let timeAcc=0, timeStretch=1, turb=1;

// Make HUD Panel Draggable via Mouse
const ui=document.getElementById('ui');
const header=document.getElementById('ui-header');
let isDragging=false, startX=0, startY=0;

header.addEventListener('mousedown', e=>{
 isDragging=true;
 startX = e.clientX - ui.offsetLeft;
 startY = e.clientY - ui.offsetTop;
 e.preventDefault();
});
window.addEventListener('mousemove', e=>{
 if(!isDragging) return;
 ui.style.left = (e.clientX - startX) + 'px';
 ui.style.top = (e.clientY - startY) + 'px';
});
window.addEventListener('mouseup', ()=>{ isDragging=false; });

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

function getTunedFreq(note){
 const mode=document.getElementById('tuningMode').value;
 if(mode==='432') return 432 * Math.pow(2, (note-69)/12);
 if(mode==='528') return 528 * Math.pow(2, (note-69)/12);
 if(mode==='just'){
  const ratios = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8];
  let octave = Math.floor((note-12)/12);
  let semitone = (note-12)%12;
  return 130.81 * ratios[semitone] * Math.pow(2, octave);
 }
 return 440*Math.pow(2,(note-69)/12);
}

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

function createVoice(note, vel=100){
 initAudio();
 if(voices.has(note)) releaseVoice(note);
 const freq=getTunedFreq(note); const mode=document.getElementById('voiceMode').value;
 let osc, src; let g=audioCtx.createGain(); g.gain.value=(vel/127)*0.6;
 let panner=audioCtx.createStereoPanner();
 let panPos=((note-48)/24)*2 - 1;
 panner.pan.value = Math.max(-1, Math.min(1, panPos));

 if(mode==='sampler' && sampleBuffers.size>0){
  let sel=document.getElementById('sampleSelect').value; let buf=sampleBuffers.get(sel);
  if(!buf){ sel=[...sampleBuffers.keys()][0]; buf=sampleBuffers.get(sel); }
  let root=parseInt(document.getElementById('rootNote').value)||60;
  src=audioCtx.createBufferSource(); src.buffer=buf;
  src.playbackRate.value = Math.pow(2, (note-root)/12);
  src.connect(g); g.connect(panner); panner.connect(filter); src.start();
 } else {
  const wave=document.getElementById('waveType').value;
  osc=audioCtx.createOscillator(); osc.type=wave; osc.frequency.value=freq;
  osc.connect(g); g.connect(panner); panner.connect(filter); osc.start();
 }

 let layerIdx=voices.size;
 let plateGeo=new THREE.PlaneGeometry(24,24,60,60);
 let hue=(note*7)%360;
 let plateMat=new THREE.MeshBasicMaterial({color:new THREE.Color(`hsl(${hue}, 100%, 55%)`), wireframe:true, transparent:true, opacity:0.8});
 let plate=new THREE.Mesh(plateGeo, plateMat);
 plate.rotation.x = -Math.PI/2.15;
 plate.position.set(-8, -3 + (layerIdx * 2.5), 0);
 scene.add(plate);

 voices.set(note, {osc, src, g, panner, plate, plateGeo, layerIdx});
 drawKeys();
}

function releaseVoice(note){
 let v=voices.get(note); if(!v) return;
 try{ if(v.osc) v.osc.stop(); if(v.src) v.src.stop(); }catch(e){}
 scene.remove(v.plate); v.plateGeo.dispose();
 voices.delete(note);
 let idx=0;
 for(let [k, val] of voices){ val.layerIdx=idx; val.plate.position.y = -3 + (idx * 2.5); idx++; }
 drawKeys();
}

window.clearAllVoices=function(){ for(let [note] of voices) releaseVoice(note); };
window.toggleUI=function(){ document.getElementById('ui').classList.toggle('collapsed'); };

keysCanvas.addEventListener('mousedown', e=>{
 const rect=keysCanvas.getBoundingClientRect();
 const x=e.clientX-rect.left;
 const total=24; let keyW=rect.width/total;
 let midi=48+Math.floor(x/keyW);
 if(voices.has(midi)) releaseVoice(midi); else createVoice(midi, 110);
});

window.setTab=t=>{
 document.querySelectorAll('.tab button').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
 document.getElementById('tb-'+t).classList.add('active'); document.getElementById('p-'+t).classList.add('active');
};

document.getElementById('knotP').addEventListener('input', updateKnotGeo);
document.getElementById('knotQ').addEventListener('input', updateKnotGeo);
function updateKnotGeo(){
 const p=parseInt(document.getElementById('knotP').value)||2;
 const q=parseInt(document.getElementById('knotQ').value)||3;
 scene.remove(torusKnot); knotGeo.dispose();
 knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32,p,q);
 torusKnot.geometry=knotGeo; scene.add(torusKnot);
}

document.getElementById('fileIn').addEventListener('change', async ev=>{
 initAudio();
 for(let f of ev.target.files){ let ab=await f.arrayBuffer(); let buf=await audioCtx.decodeAudioData(ab); sampleBuffers.set(f.name, buf); }
 refreshSampleList();
});
function refreshSampleList(){
 let sel=document.getElementById('sampleSelect'); sel.innerHTML='';
 for(let name of sampleBuffers.keys()){ let opt=document.createElement('option'); opt.value=name; opt.textContent=name; sel.appendChild(opt); }
 log(`Loaded ${sampleBuffers.size} samples.`);
}

window.genFile=async type=>{
 initAudio(); log('Synthesizing Chladni sweep...');
 let s=document.getElementById('c_start').value, e=document.getElementById('c_end').value, d=document.getElementById('c_dur').value;
 let r=await fetch(`/generate/chladni?start_freq=${s}&end_freq=${e}&duration=${d}`);
 let blob=await r.blob(); let url=URL.createObjectURL(blob);
 let audio=new Audio(url); audio.crossOrigin='anonymous';
 let src=audioCtx.createMediaElementSource(audio); src.connect(filter);
 audio.play(); log('Playing Chladni sweep file through analyzer.');
};

function animate(){
 requestAnimationFrame(animate);
 controls.update();
 timeAcc+=0.04*timeStretch;
 let amp=0;
 if(analyser){
  analyser.getByteFrequencyData(dataArray); let sum=0; for(let v of dataArray) sum+=v; amp=(sum/dataArray.length)/11;
  sctx.clearRect(0,0,spec.width,spec.height); let bw=spec.width/dataArray.length, x=0;
  for(let i=0;i<dataArray.length;i++){ let h=(dataArray[i]/255)*spec.height; sctx.fillStyle=`hsl(${180+dataArray[i]*0.4},100%,60%)`; sctx.fillRect(x,spec.height-h,bw,h); x+=bw+1; }
 }

 let matMode=document.getElementById('matMode').value;
 for(let [note, v] of voices){
  let posAttr=v.plateGeo.attributes.position;
  for(let i=0;i<posAttr.count;i++){
   let x=posAttr.getX(i), y=posAttr.getY(i); let z=0;
   if(matMode==='solid') z=Math.sin(3*x*0.2+timeAcc*turb)*Math.cos(5*y*0.2+timeAcc)*(3+amp*2);
   else if(matMode==='liquid') z=Math.sin(3*x*0.14+timeAcc+v.layerIdx)*Math.sin(5*y*0.14+timeAcc)*(4+amp*3);
   else if(matMode==='gas') z=(Math.random()-0.5)*amp*2 + Math.sin(x*0.1+timeAcc)*2;
   else z=(Math.sin(3*x*0.18)*Math.cos(5*y*0.18))*2.8*(1+amp*1.5);
   posAttr.setZ(i,z);
  }
  posAttr.needsUpdate=true;
  v.plate.rotation.z += 0.001 * (v.layerIdx+1);
 }

 torusKnot.rotation.x+=0.01; torusKnot.rotation.y+=0.014;
 let s=1+amp*0.8; torusKnot.scale.set(s,s,s); torus.scale.set(s,s,s);
 renderer.render(scene, camera);
}
animate();

if(navigator.requestMIDIAccess){
 navigator.requestMIDIAccess().then(m=>{
  for(let inp of m.inputs.values()) inp.onmidimessage=e=>{
   let st=e.data[0], d1=e.data[1], d2=e.data[2];
   if(st>=144&&st<=159&&d2>0) createVoice(d1,d2);
   else if((st>=128&&st<=143)||(st>=144&&st<=159&&d2===0)) releaseVoice(d1);
   else if(st===176){
    if(d1===1) turb=0.2+d2/16;
    if(d1===74) document.getElementById('filt').value=200+d2*90;
   }
  };
  log('MIDI Hardware ready.');
 });
}
const qmap={a:60,s:62,d:64,f:65,g:67,h:69,j:71,k:72,l:74};
window.addEventListener('keydown', e=>{ if(qmap[e.key]&&!voices.has(qmap[e.key])) createVoice(qmap[e.key],100); });
window.addEventListener('keyup', e=>{ if(qmap[e.key]) releaseVoice(qmap[e.key]); });
drawKeys();
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
