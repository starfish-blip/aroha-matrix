import os, time
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from scipy.io.wavfile import write

app = FastAPI(title="Aroha v26 Chord Stack", version="26.0")
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
<title>AROHA v26 - 3D Chord Stack & Interactive Keys</title>
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
 canvas#spec{width:100%;height:50px;background:#050505;border:1px solid #033;border-radius:4px;margin-top:6px}
 canvas#keys{width:100%;height:70px;background:#080808;border:1px solid #033;border-radius:4px;margin-top:6px;cursor:pointer}
 .status{margin-top:6px;font-size:10px;color:#0f0;border-top:1px dashed #0ff;padding-top:5px;word-break:break-all;min-height:14px}
 .small{font-size:9px;color:#6ff;margin-top:4px;line-height:1.3}
 .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
</style>
</head>
<body>
<canvas id="c"></canvas>
<canvas id="flower"></canvas>
<div id="ui">
<h2>AROHA v26 - 3D CHORD STACK</h2>
<div class="grid2">
 <label>Matter State<select id="matMode">
   <option value="solid">Solid (Sand Nodes)</option>
   <option value="liquid" selected>Liquid (Surface Waves)</option>
   <option value="gas">Gas (Vapor Dispersion)</option>
   <option value="crystal">Crystal (Plasma Lattice)</option>
 </select></label>
 <label>Waveform<select id="waveType"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="sawtooth">Saw</option><option value="square">Square</option></select></label>
</div>
<div class="grid2">
 <label>Toroid Knot P<input id="knotP" type="number" value="2" min="1" max="6"></label>
 <label>Toroid Knot Q<input id="knotQ" type="number" value="3" min="1" max="8"></label>
</div>
<label>Interactive & MIDI Keyboard (Click keys below or play Oxygen 61)</label>
<canvas id="keys"></canvas>
<button onclick="clearAllVoices()">Release All Voices</button>
<canvas id="spec" width="470" height="50"></canvas>
<div id="status" class="status">v26 Active - Click screen keys or play MIDI to stack chord layers.</div>
</div>

<script type="module">
import * as THREE from 'three';
const statusEl=document.getElementById('status');
function log(m){ statusEl.innerText=m; console.log(m); }

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x020208); scene.fog=new THREE.FogExp2(0x000000,0.025);
const camera=new THREE.PerspectiveCamera(68, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,18,32); camera.lookAt(0,2,0);
const light=new THREE.PointLight(0x00ffff, 2, 120); light.position.set(10,20,10); scene.add(light);

// Toroidal Field (Right)
let knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32, 2, 3);
const knotMat=new THREE.MeshBasicMaterial({color:0xff00ff, wireframe:true});
const torusKnot=new THREE.Mesh(knotGeo, knotMat); torusKnot.position.set(10,6,-4); scene.add(torusKnot);

const torusGeo=new THREE.TorusGeometry(8,0.6,16,100);
const torusMat=new THREE.MeshBasicMaterial({color:0x00ff88, wireframe:true, transparent:true, opacity:0.6});
const torus=new THREE.Mesh(torusGeo, torusMat); torus.position.set(10,6,-4); torus.rotation.x=Math.PI/2; scene.add(torus);

const spec=document.getElementById('spec'); const sctx=spec.getContext('2d');
const keysCanvas=document.getElementById('keys'); const kctx=keysCanvas.getContext('2d');
let audioCtx, analyser, filter, masterGain, dataArray;
let voices=new Map(); // midiNote -> {osc, gain, mesh, layerIndex}
let timeAcc=0, timeStretch=1;

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
 const w=keysCanvas.width=keysCanvas.clientWidth*2, h=keysCanvas.height=70*2;
 kctx.clearRect(0,0,w,h); kctx.fillStyle='#111'; kctx.fillRect(0,0,w,h);
 let total=24; let keyW=w/total;
 for(let i=0;i<total;i++){ let midi=48+i; let isBlack=[1,3,6,8,10].includes(midi%12); let isOn=voices.has(midi); let hue=(midi*7)%360;
  if(isOn) kctx.fillStyle=`hsl(${hue},100%,60%)`; else kctx.fillStyle=isBlack?'#222':'#ddd';
  kctx.fillRect(i*keyW, isBlack?0:20, keyW-2, isBlack?45:h-20);
  if(isOn){ kctx.fillStyle='#fff'; kctx.fillRect(i*keyW, h-6, keyW-2, 6); }
 }
}

function createVoice(note, vel=100){
 initAudio();
 if(voices.has(note)) releaseVoice(note);

 const freq=midiToFreq(note);
 const wave=document.getElementById('waveType').value;
 let osc=audioCtx.createOscillator(); osc.type=wave; osc.frequency.value=freq;
 let g=audioCtx.createGain(); g.gain.value=(vel/127)*0.5;
 osc.connect(g); g.connect(filter); osc.start();

 // Create stacked 3D cymatic plate mesh for this note
 let layerIdx=voices.size;
 let plateGeo=new THREE.PlaneGeometry(24,24,60,60);
 let hue=(note*7)%360;
 let plateMat=new THREE.MeshBasicMaterial({color:new THREE.Color(`hsl(${hue}, 100%, 55%)`), wireframe:true, transparent:true, opacity:0.8});
 let plate=new THREE.Mesh(plateGeo, plateMat);
 plate.rotation.x = -Math.PI/2.15;
 plate.position.set(-8, -3 + (layerIdx * 2.5), 0); // Stack vertically per chord note!
 scene.add(plate);

 voices.set(note, {osc, g, plate, plateGeo, layerIdx});
 drawKeys();
 log(`Note ${note} (${freq.toFixed(1)}Hz) added at stack layer ${layerIdx}`);
}

function releaseVoice(note){
 let v=voices.get(note); if(!v) return;
 try{ v.osc.stop(); v.osc.disconnect(); v.g.disconnect(); }catch(e){}
 scene.remove(v.plate); v.plateGeo.dispose();
 voices.delete(note);
 // Re-index remaining layers
 let idx=0;
 for(let [k, val] of voices){
  val.layerIdx = idx;
  val.plate.position.y = -3 + (idx * 2.5);
  idx++;
 }
 drawKeys();
}

window.clearAllVoices = function(){
 for(let [note] of voices) releaseVoice(note);
 log('All voices cleared.');
};

// Mouse/Touch interaction on on-screen keyboard
keysCanvas.addEventListener('mousedown', e=>{
 const rect=keysCanvas.getBoundingClientRect();
 const x=e.clientX-rect.left;
 const total=24; let keyW=rect.width/total;
 let idx=Math.floor(x/keyW);
 let midi=48+idx;
 if(voices.has(midi)) releaseVoice(midi); else createVoice(midi, 110);
});

function updateKnotGeometry(){
 const p=parseInt(document.getElementById('knotP').value)||2;
 const q=parseInt(document.getElementById('knotQ').value)||3;
 scene.remove(torusKnot); knotGeo.dispose();
 knotGeo=new THREE.TorusKnotGeometry(5.5,1.4,200,32,p,q);
 torusKnot.geometry=knotGeo; scene.add(torusKnot);
}
document.getElementById('knotP').addEventListener('input', updateKnotGeometry);
document.getElementById('knotQ').addEventListener('input', updateKnotGeometry);

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
 // Animate each active stacked voice plate independently
 for(let [note, v] of voices){
  let posAttr=v.plateGeo.attributes.position;
  let nRatio=3, mRatio=5;
  for(let i=0;i<posAttr.count;i++){
   let x=posAttr.getX(i), y=posAttr.getY(i); let z=0;
   if(matMode==='solid') z=Math.sin(nRatio*x*0.2+timeAcc)*Math.cos(mRatio*y*0.2+timeAcc)*(3+amp*2);
   else if(matMode==='liquid') z=Math.sin(nRatio*x*0.14+timeAcc+v.layerIdx)*Math.sin(mRatio*y*0.14+timeAcc)*(4+amp*3);
   else if(matMode==='gas') z=(Math.random()-0.5)*amp*2 + Math.sin(x*0.1+timeAcc)*2;
   else z=(Math.sin(nRatio*x*0.18)*Math.cos(mRatio*y*0.18))*2.8*(1+amp*1.5);
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
  };
  log('MIDI ready: '+[...m.inputs.values()].map(i=>i.name).join(', '));
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
