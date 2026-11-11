import { telemetry } from './telemetry-socket.js';
import { AROHAUBOSync } from './aroha_ubo_sync.js';

const state = {
  thermal_temp: 36.6,
  thermal_freq: 261.63,
  chladni_freq: 432.0,
  binaural_delta: 7.83,
  lunar_illumination: 0.5,
  lunar_energy: 0.75,
  lunar_day: 16,
  maramataka_phase: 'Rakaunui',
  maramataka_desc: 'Synchronizing with FastAPI Maramataka Engine...',
  auto_lunar: true,
  override_lunar_day: 0,
  fft_sub: 0.0,
  fft_mid: 0.0,
  fft_high: 0.0,
  wai_flux: 0.0
};

const canvas = document.getElementById('aroha-canvas');
const gl = canvas.getContext('webgl2');

const vsSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fsSource = `#version 300 es
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
}`;

function compileShader(glCtx, type, source) {
  const s = glCtx.createShader(type);
  glCtx.shaderSource(s, source);
  glCtx.compileShader(s);
  if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
    console.error('[Shader Error]:', glCtx.getShaderInfoLog(s));
  }
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);
gl.useProgram(program);

const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const posLoc = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const uboSync = new AROHAUBOSync(gl, program, 'TelemetryBlock', 0);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// --- HUD Controls & Elements ---
const elFreq = document.getElementById('slider-freq');
const elDelta = document.getElementById('slider-delta');
const elTemp = document.getElementById('slider-temp');
const elLunarDay = document.getElementById('slider-lunar-day');
const elAutoLunar = document.getElementById('chk-auto-lunar');
const elPhaseTitle = document.getElementById('lunar-phase-title');
const elPhaseDesc = document.getElementById('lunar-phase-desc');
const elReadout = document.getElementById('ubo-readout');
const elBarSub = document.getElementById('bar-sub');
const elBarMid = document.getElementById('bar-mid');
const elBarHigh = document.getElementById('bar-high');
const elBarWai = document.getElementById('bar-wai');

function updateUIFromState() {
  if (elFreq) elFreq.value = state.chladni_freq;
  if (elDelta) elDelta.value = state.binaural_delta;
  if (elTemp) elTemp.value = state.thermal_temp;
  if (elLunarDay) elLunarDay.value = state.override_lunar_day;
  if (elAutoLunar) elAutoLunar.checked = state.auto_lunar;
  updateAudioFrequencies();
}

// --- Web Audio & Live Microphone / Line-In Integration ---
let audioCtx = null;
let analyser = null;
let fftBins = null;
let subOsc = null;
let leftOsc = null;
let rightOsc = null;
let highOsc = null;
let micStream = null;
let micSource = null;
let manualFFTOverride = null;

function updateAudioFrequencies() {
  if (!audioCtx || !leftOsc || !rightOsc || !subOsc || !highOsc) return;
  const now = audioCtx.currentTime;
  subOsc.frequency.setTargetAtTime(Math.max(45.0, state.chladni_freq * 0.25), now, 0.05);
  leftOsc.frequency.setTargetAtTime(state.chladni_freq, now, 0.05);
  rightOsc.frequency.setTargetAtTime(state.chladni_freq + state.binaural_delta, now, 0.05);
  highOsc.frequency.setTargetAtTime(Math.min(6000.0, state.chladni_freq * 6.5), now, 0.05);
}

function initAudioContextIfNeeded() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    fftBins = new Uint8Array(analyser.frequencyBinCount);
  }
}

document.getElementById('btn-audio')?.addEventListener('click', (e) => {
  initAudioContextIfNeeded();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
    e.target.textContent = 'Mute Binaural + FFT Synth';
  } else if (!subOsc) {
    const merger = audioCtx.createChannelMerger(2);
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.16;

    const subGain = audioCtx.createGain();
    subGain.gain.value = 0.45;
    const highGain = audioCtx.createGain();
    highGain.gain.value = 0.22;

    subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    leftOsc = audioCtx.createOscillator();
    leftOsc.type = 'sine';
    rightOsc = audioCtx.createOscillator();
    rightOsc.type = 'triangle';
    highOsc = audioCtx.createOscillator();
    highOsc.type = 'sawtooth';

    subOsc.connect(subGain);
    subGain.connect(merger, 0, 0);
    subGain.connect(merger, 0, 1);

    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);

    highOsc.connect(highGain);
    highGain.connect(merger, 0, 0);
    highGain.connect(merger, 0, 1);

    merger.connect(analyser);
    analyser.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    updateAudioFrequencies();
    subOsc.start();
    leftOsc.start();
    rightOsc.start();
    highOsc.start();
    e.target.textContent = 'Mute Binaural + FFT Synth';
  } else {
    audioCtx.suspend();
    e.target.textContent = 'Resume Binaural + FFT Synth';
  }
});

async function toggleMicrophone(btnEl) {
  initAudioContextIfNeeded();
  if (!micStream) {
    try {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      btnEl.textContent = 'Disable Live Microphone';
    } catch (err) {
      alert('Microphone access denied or unavailable: ' + err.message);
    }
  } else {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
    if (micSource) {
      micSource.disconnect();
      micSource = null;
    }
    btnEl.textContent = 'Enable Live Microphone / Line-In';
  }
}

document.getElementById('btn-mic')?.addEventListener('click', (e) => toggleMicrophone(e.target));

function sampleFFTBands(elapsed) {
  if (manualFFTOverride) {
    state.fft_sub = manualFFTOverride.sub;
    state.fft_mid = manualFFTOverride.mid;
    state.fft_high = manualFFTOverride.high;
  } else if (analyser && audioCtx && audioCtx.state === 'running') {
    analyser.getByteFrequencyData(fftBins);
    const binHz = audioCtx.sampleRate / analyser.fftSize;

    let subSum = 0, subCount = 0;
    let midSum = 0, midCount = 0;
    let highSum = 0, highCount = 0;

    for (let i = 1; i < fftBins.length; i++) {
      const freq = i * binHz;
      const val = fftBins[i] / 255.0;
      if (freq >= 20 && freq < 160) {
        subSum += val;
        subCount++;
      } else if (freq >= 160 && freq < 2000) {
        midSum += val;
        midCount++;
      } else if (freq >= 2000 && freq <= 12000) {
        highSum += val;
        highCount++;
      }
    }

    state.fft_sub = Math.min(1.0, (subCount ? subSum / subCount : 0) * 3.5);
    state.fft_mid = Math.min(1.0, (midCount ? midSum / midCount : 0) * 4.5);
    state.fft_high = Math.min(1.0, (highCount ? highSum / highCount : 0) * 6.0);
  } else {
    const omega = elapsed * (state.binaural_delta * 0.25);
    state.fft_sub = 0.25 + 0.2 * Math.sin(omega);
    state.fft_mid = 0.30 + 0.25 * Math.cos(omega * 1.414);
    state.fft_high = 0.15 + 0.15 * Math.sin(omega * 2.718);
  }

  state.wai_flux = Math.min(
    1.5,
    ((state.fft_sub * 0.45 + state.fft_mid * 0.35 + state.fft_high * 0.20) * (1.0 + 0.5 * state.lunar_energy))
  );
}

// --- M-Audio Oxygen 61 Web MIDI & Simulation Integration ---
function handleMIDIMessage(ccNumber, ccValue) {
  const normalized = ccValue / 127.0;
  let updated = false;

  switch (ccNumber) {
    case 7:  // Slider 1 -> Chladni Carrier Freq (110Hz - 880Hz)
      state.chladni_freq = 110.0 + normalized * 770.0;
      updated = true;
      break;
    case 74: // Knob 1 -> Binaural Entrainment Delta (0.5Hz - 40Hz)
      state.binaural_delta = 0.5 + normalized * 39.5;
      updated = true;
      break;
    case 71: // Knob 2 -> Thermal Resonator Bias (30.0C - 45.0C)
      state.thermal_temp = 30.0 + normalized * 15.0;
      updated = true;
      break;
    case 10: // Knob 3 -> Maramataka Night Scrub
      state.auto_lunar = (ccValue === 0);
      state.override_lunar_day = ccValue === 0 ? 0 : Math.min(30, Math.max(1, Math.round(normalized * 30)));
      updated = true;
      break;
  }

  if (updated) {
    updateUIFromState();
    telemetry.send({
      auto_lunar: state.auto_lunar,
      override_lunar_day: state.override_lunar_day,
      chladni_freq: state.chladni_freq,
      binaural_delta: state.binaural_delta,
      thermal_temp: state.thermal_temp
    });
  }
}

function initOxygen61MIDI() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then((midiAccess) => {
    for (const input of midiAccess.inputs.values()) {
      input.onmidimessage = (event) => {
        const [status, data1, data2] = event.data;
        if ((status & 0xF0) === 0xB0) handleMIDIMessage(data1, data2);
      };
    }
  }).catch(() => {});
}
initOxygen61MIDI();

// --- HUD & WebSocket Sync Handlers ---
function pushManualUpdate(isFreqEdit = false) {
  if (isFreqEdit && elAutoLunar) elAutoLunar.checked = false;
  state.auto_lunar = elAutoLunar ? elAutoLunar.checked : false;
  state.override_lunar_day = elLunarDay ? parseInt(elLunarDay.value, 10) : 0;
  state.chladni_freq = parseFloat(elFreq.value);
  state.binaural_delta = parseFloat(elDelta.value);
  state.thermal_temp = parseFloat(elTemp.value);
  updateAudioFrequencies();
  telemetry.send({
    auto_lunar: state.auto_lunar,
    override_lunar_day: state.override_lunar_day,
    chladni_freq: state.chladni_freq,
    binaural_delta: state.binaural_delta,
    thermal_temp: state.thermal_temp
  });
}

elFreq?.addEventListener('input', () => pushManualUpdate(true));
elDelta?.addEventListener('input', () => pushManualUpdate(true));
elTemp?.addEventListener('input', () => pushManualUpdate(false));
elLunarDay?.addEventListener('input', () => pushManualUpdate(false));
elAutoLunar?.addEventListener('change', () => pushManualUpdate(false));

telemetry.onMessage((packet) => {
  Object.assign(state, packet);
  if (elPhaseTitle) {
    const modeTag = state.override_lunar_day > 0 ? `Override Night ${state.lunar_day}/30` : `Live Night ${state.lunar_day}/30`;
    elPhaseTitle.textContent = `${state.maramataka_phase.toUpperCase()} // ${modeTag}`;
  }
  if (elPhaseDesc) {
    elPhaseDesc.textContent = `${state.maramataka_desc} | Illum: ${(state.lunar_illumination * 100).toFixed(1)}% | Energy: ${(state.lunar_energy * 100).toFixed(0)}%`;
  }
  if (state.auto_lunar) updateUIFromState();
});

const startTime = performance.now();
function render(now) {
  const elapsed = (now - startTime) * 0.001;
  sampleFFTBands(elapsed);
  uboSync.update(state, elapsed);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  if (elBarSub) elBarSub.style.width = `${Math.min(100, state.fft_sub * 100).toFixed(1)}%`;
  if (elBarMid) elBarMid.style.width = `${Math.min(100, state.fft_mid * 100).toFixed(1)}%`;
  if (elBarHigh) elBarHigh.style.width = `${Math.min(100, state.fft_high * 100).toFixed(1)}%`;
  if (elBarWai) elBarWai.style.width = `${Math.min(100, (state.wai_flux / 1.5) * 100).toFixed(1)}%`;

  if (elReadout) {
    elReadout.textContent = `UBO[48B] // MIDI Active -> Sub:${state.fft_sub.toFixed(2)} Mid:${state.fft_mid.toFixed(2)} Wai:${state.wai_flux.toFixed(2)}`;
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// --- Diagnostic Hook ---
window.__AROHA_DEBUG__ = {
  gl, program, uboSync, state, telemetry,
  startAudio: () => document.getElementById('btn-audio')?.click(),
  startMic: () => document.getElementById('btn-mic')?.click(),
  setFFTOverride: (sub, mid, high) => { manualFFTOverride = (sub === null) ? null : { sub, mid, high }; },
  injectMIDI: (cc, val) => handleMIDIMessage(cc, val),
  readGPUUBO() {
    const out = new Float32Array(12);
    gl.bindBuffer(gl.UNIFORM_BUFFER, uboSync.buffer);
    gl.getBufferSubData(gl.UNIFORM_BUFFER, 0, out);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    return {
      byteLength: out.byteLength,
      blockIndex: uboSync.blockIndex,
      bindingPoint: uboSync.bindingPoint,
      floats: Array.from(out)
    };
  }
};


