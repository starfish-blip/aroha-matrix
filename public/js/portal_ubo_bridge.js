export class PortalUBOBridge {
  constructor(gl, program, engine, options = {}) {
    this.gl = gl;
    this.program = program;
    this.engine = engine;
    this.blockName = options.blockName || 'ArohaHarmonicBlock';
    this.bindingPoint = options.bindingPoint ?? 0;

    // 64 bytes = 16 float32 values (4 x vec4 std140 aligned)
    this.data = new Float32Array(16);
    this.timeBuf = null;
    this.freqBuf = null;
    this.startTimeMs = performance.now();

    this.ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bindingPoint, this.ubo);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    const blockIndex = gl.getUniformBlockIndex(program, this.blockName);
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(program, blockIndex, this.bindingPoint);
    } else {
      console.warn(`[PortalUBOBridge] Uniform block "${this.blockName}" not active in shader.`);
    }
  }

  sampleAnalyser() {
    const analyser = this.engine?.analyser;
    if (!analyser || !this.engine?.isRunning) {
      return { rms: 0.0, carrierEnergy: 0.0 };
    }

    if (!this.timeBuf || this.timeBuf.length !== analyser.fftSize) {
      this.timeBuf = new Float32Array(analyser.fftSize);
    }
    if (!this.freqBuf || this.freqBuf.length !== analyser.frequencyBinCount) {
      this.freqBuf = new Uint8Array(analyser.frequencyBinCount);
    }

    analyser.getFloatTimeDomainData(this.timeBuf);
    let sumSq = 0.0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const s = this.timeBuf[i];
      sumSq += s * s;
    }
    // Scale normalized sine RMS (~0.15 at 0.22 gain) into [0.0, 1.0] visual range
    const rms = Math.min(1.0, Math.sqrt(sumSq / this.timeBuf.length) * 5.0);

    analyser.getByteFrequencyData(this.freqBuf);
    // Bin 1 covers ~93.75 - 281.25 Hz at 48 kHz / fftSize 256 (captures 136.1 Hz carrier)
    const carrierEnergy = (this.freqBuf[1] ?? 0) / 255.0;

    return { rms, carrierEnergy };
  }

  update(nowMs = performance.now()) {
    const elapsedSec = (nowMs - this.startTimeMs) * 0.001;
    const state = this.engine?.lastState || {};
    const res = state.resonance || {};
    const unlocked = state.status === 'unlocked' ? 1.0 : 0.0;

    const mode = Array.isArray(res.chladni_mode) ? res.chladni_mode : [5, 7];
    const m = Number(mode[0] ?? 5);
    const n = Number(mode[1] ?? 7);
    const carrierHz = Number(res.carrier_hz ?? 136.1);
    const offsetHz = Number(res.binaural_offset_hz ?? 4.0);
    const focusState = Number(res.focus_state ?? 12);
    const vertebraeNorm = Number(res.vertebrae_count ?? 33) / 33.0;

    const { rms, carrierEnergy } = this.sampleAnalyser();
    const beatPhase = (elapsedSec * offsetHz) % 1.0;

    // Deeper Focus states (10 -> 21) tighten nodal line sharpness and resonance gain
    const focusGainMap = { 10: 1.0, 12: 1.35, 15: 1.75, 21: 2.2 };
    const sharpness = (focusGainMap[focusState] ?? 1.2) + rms * 1.4;

    // vec4 u_harmonic (bytes 0..15)
    this.data[0] = m;
    this.data[1] = n;
    this.data[2] = carrierHz;
    this.data[3] = offsetHz;

    // vec4 u_audio_telemetry (bytes 16..31)
    this.data[4] = rms;
    this.data[5] = carrierEnergy;
    this.data[6] = beatPhase;
    this.data[7] = unlocked;

    // vec4 u_gateway_state (bytes 32..47)
    this.data[8] = focusState;
    this.data[9] = vertebraeNorm;
    this.data[10] = elapsedSec;
    this.data[11] = sharpness;

    // vec4 u_reserved_pad (bytes 48..63)
    this.data[12] = 0.0;
    this.data[13] = 0.0;
    this.data[14] = 0.0;
    this.data[15] = 0.0;

    const gl = this.gl;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    return this.data;
  }

  dispose() {
    if (this.ubo) {
      this.gl.deleteBuffer(this.ubo);
      this.ubo = null;
    }
  }
}