var q=class{constructor(e="/api/ws"){let o=window.location.protocol==="https:"?"wss:":"ws:";this.url=`${o}//${window.location.host}${e}`,this.socket=null,this.isConnected=!1,this.reconnectInterval=3e3,this.listeners=new Set}connect(){this.socket=new WebSocket(this.url),this.socket.onopen=()=>{this.isConnected=!0,this.send({type:"INIT"})},this.socket.onmessage=e=>{try{this.notifyListeners(JSON.parse(e.data))}catch{}},this.socket.onclose=()=>{this.isConnected=!1,setTimeout(()=>this.connect(),this.reconnectInterval)},this.socket.onerror=()=>{this.socket.close()}}send(e){this.isConnected&&this.socket.readyState===WebSocket.OPEN&&this.socket.send(JSON.stringify(e))}onMessage(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notifyListeners(e){for(let o of this.listeners)o(e)}},h=new q;h.connect();var x=class{constructor(e,o,n="TelemetryBlock",l=0){this.gl=e,this.program=o,this.bindingPoint=l,this.data=new Float32Array(12),this.buffer=e.createBuffer(),this.blockIndex=e.getUniformBlockIndex(o,n),this.blockIndex!==e.INVALID_INDEX?(e.uniformBlockBinding(o,this.blockIndex,this.bindingPoint),e.bindBuffer(e.UNIFORM_BUFFER,this.buffer),e.bufferData(e.UNIFORM_BUFFER,this.data.byteLength,e.DYNAMIC_DRAW),e.bindBufferBase(e.UNIFORM_BUFFER,this.bindingPoint,this.buffer),e.bindBuffer(e.UNIFORM_BUFFER,null)):console.warn(`[AROHA UBO] Block ${n} not found in shader.`)}update(e,o){let n=this.gl;this.data[0]=e.thermal_temp??36.6,this.data[1]=e.chladni_freq??432,this.data[2]=o,this.data[3]=e.binaural_delta??7.83,this.data[4]=e.lunar_illumination??.5,this.data[5]=e.lunar_energy??.5,this.data[6]=e.thermal_freq??261.63,this.data[7]=e.lunar_day??16,this.data[8]=e.fft_sub??0,this.data[9]=e.fft_mid??0,this.data[10]=e.fft_high??0,this.data[11]=e.wai_flux??0,n.bindBuffer(n.UNIFORM_BUFFER,this.buffer),n.bufferSubData(n.UNIFORM_BUFFER,0,this.data),n.bindBuffer(n.UNIFORM_BUFFER,null)}};var t={thermal_temp:36.6,thermal_freq:261.63,chladni_freq:432,binaural_delta:7.83,lunar_illumination:.5,lunar_energy:.75,lunar_day:16,maramataka_phase:"Rakaunui",maramataka_desc:"Synchronizing with FastAPI Maramataka Engine...",auto_lunar:!0,override_lunar_day:0,fft_sub:0,fft_mid:0,fft_high:0,wai_flux:0},v=document.getElementById("aroha-canvas"),i=v.getContext("webgl2"),X=`#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`,K=`#version 300 es
precision highp float;

layout(std140) uniform TelemetryBlock {
  float u_thermal_temp;
  float u_chladni_freq;
  float u_time;
  float u_binaural_delta;
  float u_lunar_illumination;
  float u_lunar_energy;
  float u_thermal_freq;
  float u_lunar_day;
  float u_fft_sub;
  float u_fft_mid;
  float u_fft_high;
  float u_wai_flux;
};

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 p = (v_uv - 0.5) * 2.2;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float pi = 3.14159265359;

  float z1Weight = 1.0 - smoothstep(0.28, 0.38, r);
  float z2Weight = smoothstep(0.28, 0.38, r) * (1.0 - smoothstep(0.62, 0.72, r));
  float z3Weight = smoothstep(0.62, 0.72, r);

  vec2 displacedP = p * (1.0 - 0.15 * u_fft_sub * z1Weight);
  float harmonicRatio = (u_chladni_freq / max(100.0, u_thermal_freq)) * (1.0 + 0.35 * u_fft_mid);
  float n = max(1.0, floor((u_chladni_freq / 85.0) + u_lunar_energy * 3.0 + u_fft_sub * 2.0));
  float m = max(2.0, floor(n * 1.4142 + u_lunar_illumination * 2.0 + u_fft_mid * 3.0));

  float tidalPhase = u_time * (u_binaural_delta * 0.2) * (0.4 + u_lunar_energy + u_wai_flux * 0.5);

  float w1 = cos(n * pi * displacedP.x + tidalPhase) * cos(m * pi * displacedP.y - tidalPhase);
  float w2 = cos(m * pi * displacedP.x - tidalPhase) * cos(n * pi * displacedP.y + tidalPhase);
  float highShimmer = sin((12.0 + floor(u_lunar_day * 0.5)) * angle + r * 18.0 * pi - u_time * 4.0) * u_fft_high * z3Weight;
  float polarWave = cos(floor(3.0 + u_lunar_day * 0.25) * angle + r * pi * harmonicRatio - tidalPhase);

  float standingWave = abs((w1 - w2) * (0.65 + 0.25 * u_fft_mid) + polarWave * 0.3 * u_lunar_energy + highShimmer * 0.25);

  float lineThickness = 0.04 + 0.035 * u_lunar_illumination + 0.045 * u_wai_flux;
  float nodalLine = smoothstep(lineThickness, 0.0, standingWave);

  float z1Ring = smoothstep(0.018 + 0.02 * u_fft_sub, 0.0, abs(r - 0.33));
  float z2Ring = smoothstep(0.018 + 0.02 * u_fft_mid, 0.0, abs(r - 0.66));
  float lunarCorona = smoothstep(0.99, 0.88, r) * smoothstep(0.80, 0.94, r) * (0.3 + 0.7 * u_lunar_illumination + 0.6 * u_fft_high);
  float domeMask = smoothstep(1.02, 0.95, r);

  vec3 subBassCyan = vec3(0.0, 0.95, 0.85);
  vec3 midHarmonicGold = vec3(0.98, 0.82, 0.35);
  vec3 highShimmerViolet = vec3(0.75, 0.38, 1.0);
  vec3 thermalCrimson = vec3(1.0, 0.28, 0.18);

  float heatFactor = clamp((u_thermal_temp - 35.0) / 10.0, 0.0, 1.0);
  vec3 zoneCol = subBassCyan * z1Weight + midHarmonicGold * z2Weight + highShimmerViolet * z3Weight;
  vec3 lunarCol = mix(zoneCol, midHarmonicGold, u_lunar_illumination * 0.45);
  vec3 resonanceCol = mix(lunarCol, thermalCrimson, heatFactor * 0.45);

  vec3 bg = vec3(0.015, 0.03, 0.07) * (0.5 + 0.5 * u_lunar_illumination + 0.3 * u_wai_flux);
  vec3 finalCol = mix(bg, resonanceCol, nodalLine)
                + resonanceCol * exp(-4.0 * standingWave) * (0.2 + 0.35 * u_wai_flux)
                + midHarmonicGold * lunarCorona * 0.65
                + subBassCyan * z1Ring * (0.35 + 0.65 * u_fft_sub)
                + highShimmerViolet * z2Ring * (0.35 + 0.65 * u_fft_mid);

  fragColor = vec4(finalCol * domeMask, 1.0);
}`;function $(a,e,o){let n=a.createShader(e);return a.shaderSource(n,o),a.compileShader(n),a.getShaderParameter(n,a.COMPILE_STATUS)||console.error("[Shader Error]:",a.getShaderInfoLog(n)),n}var c=i.createProgram();i.attachShader(c,$(i,i.VERTEX_SHADER,X));i.attachShader(c,$(i,i.FRAGMENT_SHADER,K));i.linkProgram(c);i.useProgram(c);var Q=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,Q);i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),i.STATIC_DRAW);var G=i.getAttribLocation(c,"a_position");i.enableVertexAttribArray(G);i.vertexAttribPointer(G,2,i.FLOAT,!1,0,0);var F=new x(i,c,"TelemetryBlock",0);function H(){v.width=window.innerWidth,v.height=window.innerHeight,i.viewport(0,0,v.width,v.height)}window.addEventListener("resize",H);H();var S=document.getElementById("slider-freq"),k=document.getElementById("slider-delta"),A=document.getElementById("slider-temp"),I=document.getElementById("slider-lunar-day"),d=document.getElementById("chk-auto-lunar"),O=document.getElementById("lunar-phase-title"),L=document.getElementById("lunar-phase-desc"),P=document.getElementById("ubo-readout"),D=document.getElementById("bar-sub"),z=document.getElementById("bar-mid"),N=document.getElementById("bar-high"),W=document.getElementById("bar-wai");function V(){S&&(S.value=t.chladni_freq),k&&(k.value=t.binaural_delta),A&&(A.value=t.thermal_temp),I&&(I.value=t.override_lunar_day),d&&(d.checked=t.auto_lunar),T()}var r=null,s=null,E=null,u=null,_=null,m=null,g=null,b=null,y=null,B=null;function T(){if(!r||!_||!m||!u||!g)return;let a=r.currentTime;u.frequency.setTargetAtTime(Math.max(45,t.chladni_freq*.25),a,.05),_.frequency.setTargetAtTime(t.chladni_freq,a,.05),m.frequency.setTargetAtTime(t.chladni_freq+t.binaural_delta,a,.05),g.frequency.setTargetAtTime(Math.min(6e3,t.chladni_freq*6.5),a,.05)}function Y(){r||(r=new(window.AudioContext||window.webkitAudioContext),s=r.createAnalyser(),s.fftSize=1024,s.smoothingTimeConstant=.75,E=new Uint8Array(s.frequencyBinCount))}document.getElementById("btn-audio")?.addEventListener("click",a=>{if(Y(),r.state==="suspended")r.resume(),a.target.textContent="Mute Binaural + FFT Synth";else if(u)r.suspend(),a.target.textContent="Resume Binaural + FFT Synth";else{let e=r.createChannelMerger(2),o=r.createGain();o.gain.value=.16;let n=r.createGain();n.gain.value=.45;let l=r.createGain();l.gain.value=.22,u=r.createOscillator(),u.type="sine",_=r.createOscillator(),_.type="sine",m=r.createOscillator(),m.type="triangle",g=r.createOscillator(),g.type="sawtooth",u.connect(n),n.connect(e,0,0),n.connect(e,0,1),_.connect(e,0,0),m.connect(e,0,1),g.connect(l),l.connect(e,0,0),l.connect(e,0,1),e.connect(s),s.connect(o),o.connect(r.destination),T(),u.start(),_.start(),m.start(),g.start(),a.target.textContent="Mute Binaural + FFT Synth"}});async function Z(a){if(Y(),b)b.getTracks().forEach(e=>e.stop()),b=null,y&&(y.disconnect(),y=null),a.textContent="Enable Live Microphone / Line-In";else try{r.state==="suspended"&&await r.resume(),b=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1}),y=r.createMediaStreamSource(b),y.connect(s),a.textContent="Disable Live Microphone"}catch(e){alert("Microphone access denied or unavailable: "+e.message)}}document.getElementById("btn-mic")?.addEventListener("click",a=>Z(a.target));function ee(a){if(B)t.fft_sub=B.sub,t.fft_mid=B.mid,t.fft_high=B.high;else if(s&&r&&r.state==="running"){s.getByteFrequencyData(E);let e=r.sampleRate/s.fftSize,o=0,n=0,l=0,p=0,U=0,R=0;for(let M=1;M<E.length;M++){let f=M*e,C=E[M]/255;f>=20&&f<160?(o+=C,n++):f>=160&&f<2e3?(l+=C,p++):f>=2e3&&f<=12e3&&(U+=C,R++)}t.fft_sub=Math.min(1,(n?o/n:0)*3.5),t.fft_mid=Math.min(1,(p?l/p:0)*4.5),t.fft_high=Math.min(1,(R?U/R:0)*6)}else{let e=a*(t.binaural_delta*.25);t.fft_sub=.25+.2*Math.sin(e),t.fft_mid=.3+.25*Math.cos(e*1.414),t.fft_high=.15+.15*Math.sin(e*2.718)}t.wai_flux=Math.min(1.5,(t.fft_sub*.45+t.fft_mid*.35+t.fft_high*.2)*(1+.5*t.lunar_energy))}function j(a,e){let o=e/127,n=!1;switch(a){case 7:t.chladni_freq=110+o*770,n=!0;break;case 74:t.binaural_delta=.5+o*39.5,n=!0;break;case 71:t.thermal_temp=30+o*15,n=!0;break;case 10:t.auto_lunar=e===0,t.override_lunar_day=e===0?0:Math.min(30,Math.max(1,Math.round(o*30))),n=!0;break}n&&(V(),h.send({auto_lunar:t.auto_lunar,override_lunar_day:t.override_lunar_day,chladni_freq:t.chladni_freq,binaural_delta:t.binaural_delta,thermal_temp:t.thermal_temp}))}function te(){navigator.requestMIDIAccess&&navigator.requestMIDIAccess().then(a=>{for(let e of a.inputs.values())e.onmidimessage=o=>{let[n,l,p]=o.data;(n&240)===176&&j(l,p)}}).catch(()=>{})}te();function w(a=!1){a&&d&&(d.checked=!1),t.auto_lunar=d?d.checked:!1,t.override_lunar_day=I?parseInt(I.value,10):0,t.chladni_freq=parseFloat(S.value),t.binaural_delta=parseFloat(k.value),t.thermal_temp=parseFloat(A.value),T(),h.send({auto_lunar:t.auto_lunar,override_lunar_day:t.override_lunar_day,chladni_freq:t.chladni_freq,binaural_delta:t.binaural_delta,thermal_temp:t.thermal_temp})}S?.addEventListener("input",()=>w(!0));k?.addEventListener("input",()=>w(!0));A?.addEventListener("input",()=>w(!1));I?.addEventListener("input",()=>w(!1));d?.addEventListener("change",()=>w(!1));h.onMessage(a=>{if(Object.assign(t,a),O){let e=t.override_lunar_day>0?`Override Night ${t.lunar_day}/30`:`Live Night ${t.lunar_day}/30`;O.textContent=`${t.maramataka_phase.toUpperCase()} // ${e}`}L&&(L.textContent=`${t.maramataka_desc} | Illum: ${(t.lunar_illumination*100).toFixed(1)}% | Energy: ${(t.lunar_energy*100).toFixed(0)}%`),t.auto_lunar&&V()});var ae=performance.now();function J(a){let e=(a-ae)*.001;ee(e),F.update(t,e),i.drawArrays(i.TRIANGLES,0,6),D&&(D.style.width=`${Math.min(100,t.fft_sub*100).toFixed(1)}%`),z&&(z.style.width=`${Math.min(100,t.fft_mid*100).toFixed(1)}%`),N&&(N.style.width=`${Math.min(100,t.fft_high*100).toFixed(1)}%`),W&&(W.style.width=`${Math.min(100,t.wai_flux/1.5*100).toFixed(1)}%`),P&&(P.textContent=`UBO[48B] // MIDI Active -> Sub:${t.fft_sub.toFixed(2)} Mid:${t.fft_mid.toFixed(2)} Wai:${t.wai_flux.toFixed(2)}`),requestAnimationFrame(J)}requestAnimationFrame(J);window.__AROHA_DEBUG__={gl:i,program:c,uboSync:F,state:t,telemetry:h,startAudio:()=>document.getElementById("btn-audio")?.click(),startMic:()=>document.getElementById("btn-mic")?.click(),setFFTOverride:(a,e,o)=>{B=a===null?null:{sub:a,mid:e,high:o}},injectMIDI:(a,e)=>j(a,e),readGPUUBO(){let a=new Float32Array(12);return i.bindBuffer(i.UNIFORM_BUFFER,F.buffer),i.getBufferSubData(i.UNIFORM_BUFFER,0,a),i.bindBuffer(i.UNIFORM_BUFFER,null),{byteLength:a.byteLength,blockIndex:F.blockIndex,bindingPoint:F.bindingPoint,floats:Array.from(a)}}};
//# sourceMappingURL=bundle.js.map
