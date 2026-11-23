/**
 * ArohaTelemetryUBO — 48-byte (12 x float32) WebGL2 std140 Uniform Buffer Object
 * Shared state bus across all 8 AROHA ES modules + FastAPI SSE stream over Tailscale/local.
 *
 * std140 Layout (3 x vec4 = 48 bytes):
 *   vec4[0] (bytes  0..15): [carrierHz, beatDeltaHz, thermalTempC, lunarPhase]
 *   vec4[1] (bytes 16..31): [chladniN, chladniM, filterCutoffHz, resonanceQ]
 *   vec4[2] (bytes 32..47): [jupiterGain, saturnGain, sigilCharge, timeSec]
 */
export const UBO_BYTE_LENGTH = 48;
export const UBO_FLOAT_COUNT = 12;
export const UBO_BINDING_POINT = 0;
export const TAILSCALE_SSE_URL = "http://100.104.121.111:8000/api/v1/portal/telemetry/stream";
export const LOCAL_SSE_URL = "http://127.0.0.1:8000/api/v1/portal/telemetry/stream";

export const UBO_SLOTS = Object.freeze({
  CARRIER_HZ: 0,       // default 432.0 (108..442368 Hz fader span)
  BEAT_DELTA_HZ: 1,    // default 6.0 Hz Theta carrier (SSVEP visual cap < 3.0 Hz)
  THERMAL_TEMP_C: 2,   // default 36.6 C Living Anchor fulcrum
  LUNAR_PHASE: 3,      // 0.0..1.0 Maramataka normalized cycle
  CHLADNI_N: 4,        // Chladni nodal mode n
  CHLADNI_M: 5,        // Chladni nodal mode m
  FILTER_CUTOFF: 6,    // Flower-of-Life lowpass cutoff (Hz)
  RESONANCE_Q: 7,      // Filter Q / harmonic damping
  JUPITER_GAIN: 8,     // Lower/Mid cosmological fader bank weight (0..1)
  SATURN_GAIN: 9,      // Brilliance/Ultrasonic fader bank weight (0..1)
  SIGIL_CHARGE: 10,    // Alchemist sigil / Sovereign Handshake state (0..1)
  TIME_SEC: 11         // Monotonic elapsed time (s)
});

export class ArohaTelemetryUBO extends EventTarget {
  constructor(initialState = {}) {
    super();
    this.buffer = new ArrayBuffer(UBO_BYTE_LENGTH);
    this.f32 = new Float32Array(this.buffer);
    this.gl = null;
    this.glBuffer = null;
    this.dirty = true;
    this.subscribers = new Map();
    this.history = [];
    this.maxHistory = 256;
    this._sseSource = null;
    this._sseReconnectTimer = null;

    // Initialize Living Anchor & Harmonic defaults
    this.f32[UBO_SLOTS.CARRIER_HZ] = 432.0;
    this.f32[UBO_SLOTS.BEAT_DELTA_HZ] = 6.0;
    this.f32[UBO_SLOTS.THERMAL_TEMP_C] = 36.6;
    this.f32[UBO_SLOTS.LUNAR_PHASE] = 0.0;
    this.f32[UBO_SLOTS.CHLADNI_N] = 3.0;
    this.f32[UBO_SLOTS.CHLADNI_M] = 5.0;
    this.f32[UBO_SLOTS.FILTER_CUTOFF] = 1800.0;
    this.f32[UBO_SLOTS.RESONANCE_Q] = 1.414;
    this.f32[UBO_SLOTS.JUPITER_GAIN] = 0.75;
    this.f32[UBO_SLOTS.SATURN_GAIN] = 0.65;
    this.f32[UBO_SLOTS.SIGIL_CHARGE] = 0.0;
    this.f32[UBO_SLOTS.TIME_SEC] = 0.0;

    this.patch(initialState, "init");
  }

  attachWebGL2(gl, program, blockName = "ArohaTelemetryUBO", bindingPoint = UBO_BINDING_POINT) {
    if (!gl) return null;
    this.gl = gl;
    if (program) {
      const blockIndex = gl.getUniformBlockIndex(program, blockName);
      if (blockIndex !== gl.INVALID_INDEX) {
        gl.uniformBlockBinding(program, blockIndex, bindingPoint);
      }
    }
    this.glBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.f32, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, this.glBuffer);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    this.dirty = false;
    return this.glBuffer;
  }

  setSlot(slotIndex, value, source = "unknown") {
    if (slotIndex < 0 || slotIndex >= UBO_FLOAT_COUNT || Number.isNaN(Number(value))) return;
    let next = Number(value);
    if (slotIndex === UBO_SLOTS.THERMAL_TEMP_C && next === 0) next = 36.6;

    const prev = this.f32[slotIndex];
    if (Math.abs(prev - next) < 1e-6) return;

    this.f32[slotIndex] = next;
    this.dirty = true;
    this._emit(source, { slot: slotIndex, prev, next });
  }

  patch(updates = {}, source = "patch") {
    const normalized = { ...updates };
    if (normalized.ubo_harmonic !== undefined && normalized.carrierHz === undefined) {
      normalized.carrierHz = normalized.ubo_harmonic;
    }
    if (Array.isArray(normalized.chladni_mode)) {
      if (normalized.chladni_mode[0] !== undefined && normalized.chladniN === undefined) normalized.chladniN = normalized.chladni_mode[0];
      if (normalized.chladni_mode[1] !== undefined && normalized.chladniM === undefined) normalized.chladniM = normalized.chladni_mode[1];
    }
    if (normalized.resonance !== undefined && normalized.sigilCharge === undefined) {
      normalized.sigilCharge = normalized.resonance;
    }

    const keyMap = {
      carrierHz: UBO_SLOTS.CARRIER_HZ,
      beatDeltaHz: UBO_SLOTS.BEAT_DELTA_HZ,
      thermalTempC: UBO_SLOTS.THERMAL_TEMP_C,
      lunarPhase: UBO_SLOTS.LUNAR_PHASE,
      chladniN: UBO_SLOTS.CHLADNI_N,
      chladniM: UBO_SLOTS.CHLADNI_M,
      filterCutoffHz: UBO_SLOTS.FILTER_CUTOFF,
      resonanceQ: UBO_SLOTS.RESONANCE_Q,
      jupiterGain: UBO_SLOTS.JUPITER_GAIN,
      saturnGain: UBO_SLOTS.SATURN_GAIN,
      sigilCharge: UBO_SLOTS.SIGIL_CHARGE,
      timeSec: UBO_SLOTS.TIME_SEC
    };

    let changed = false;
    for (const [key, val] of Object.entries(normalized)) {
      const idx = keyMap[key];
      if (idx !== undefined && !Number.isNaN(Number(val))) {
        this.f32[idx] = Number(val);
        changed = true;
      }
    }
    if (changed) {
      this.dirty = true;
      this._emit(source, normalized);
    }
  }

  commit(timeSec = null) {
    if (timeSec !== null) {
      this.f32[UBO_SLOTS.TIME_SEC] = Number(timeSec);
      this.dirty = true;
    }
    if (this.gl && this.glBuffer && this.dirty) {
      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.glBuffer);
      this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, this.f32);
      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
      this.dirty = false;
    }
    return this.f32;
  }

  snapshot() {
    return {
      carrierHz: this.f32[UBO_SLOTS.CARRIER_HZ],
      beatDeltaHz: this.f32[UBO_SLOTS.BEAT_DELTA_HZ],
      thermalTempC: this.f32[UBO_SLOTS.THERMAL_TEMP_C],
      lunarPhase: this.f32[UBO_SLOTS.LUNAR_PHASE],
      chladniN: this.f32[UBO_SLOTS.CHLADNI_N],
      chladniM: this.f32[UBO_SLOTS.CHLADNI_M],
      filterCutoffHz: this.f32[UBO_SLOTS.FILTER_CUTOFF],
      resonanceQ: this.f32[UBO_SLOTS.RESONANCE_Q],
      jupiterGain: this.f32[UBO_SLOTS.JUPITER_GAIN],
      saturnGain: this.f32[UBO_SLOTS.SATURN_GAIN],
      sigilCharge: this.f32[UBO_SLOTS.SIGIL_CHARGE],
      timeSec: this.f32[UBO_SLOTS.TIME_SEC]
    };
  }

  connectSSE(url = TAILSCALE_SSE_URL, reconnectMs = 3000) {
    this.disconnectSSE();
    if (typeof EventSource === "undefined") {
      return { connected: false, reason: "EventSource unavailable in current runtime", url };
    }

    const es = new EventSource(url);
    this._sseSource = es;

    const handlePayload = (raw) => {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const payload = parsed?.telemetry && typeof parsed.telemetry === "object" ? parsed.telemetry : parsed;
        if (payload && typeof payload === "object") {
          this.patch(payload, "fastapi-sse");
        }
      } catch (_) {}
    };

    es.onmessage = (evt) => handlePayload(evt.data);
    es.addEventListener("telemetry", (evt) => handlePayload(evt.data));
    es.addEventListener("ubo", (evt) => handlePayload(evt.data));
    es.onerror = () => {
      if (this._sseReconnectTimer) clearTimeout(this._sseReconnectTimer);
      this._sseReconnectTimer = setTimeout(() => {
        if (this._sseSource === es) {
          this.connectSSE(url, reconnectMs);
        }
      }, reconnectMs);
    };

    return es;
  }

  disconnectSSE() {
    if (this._sseReconnectTimer) {
      clearTimeout(this._sseReconnectTimer);
      this._sseReconnectTimer = null;
    }
    if (this._sseSource && typeof this._sseSource.close === "function") {
      this._sseSource.close();
    }
    this._sseSource = null;
  }

  _emit(source, delta) {
    const payload = { source, delta, state: this.snapshot(), ts: Date.now() };
    this.history.push(payload);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.dispatchEvent(new CustomEvent("ubo:update", { detail: payload }));
  }
}

export const sharedArohaUBO = new ArohaTelemetryUBO();