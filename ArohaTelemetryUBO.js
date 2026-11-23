// ArohaTelemetryUBO.js - 48-byte (12x float32) std140 UBO backed by SSE stream
export const STREAM_URL = "http://100.64.150.117:8000/api/v1/portal/telemetry/stream";

export class ArohaTelemetryUBO {
  constructor(url = STREAM_URL) {
    this.url = url;
    // 48 bytes total = 12 float32 values (std140 aligned)
    this.buffer = new Float32Array(12);
    this.state = {
      unlocked: false,
      resonance: 0.0,
      ubo_harmonic: 432.0,
      vertebrae_count: 33,
      chladni_mode: [5, 7],
      harmonic_lock: true,
      focus_state: 12,
      ts: "",
    };
    this.listeners = new Set();
    this.source = null;
  }

  writeToBuffer(frame) {
    const mode = Array.isArray(frame.chladni_mode) ? frame.chladni_mode : [5, 7];
    const m = Number(mode[0] ?? 5);
    const n = Number(mode[1] ?? 7);
    // Layout (12 floats = 48 bytes):
    // [0] unlocked (0|1), [1] resonance, [2] ubo_harmonic, [3] vertebrae_count,
    // [4] chladni_m, [5] chladni_n, [6] harmonic_lock (0|1), [7] focus_state,
    // [8..11] padding / reserved alignment slots
    this.buffer[0] = frame.unlocked ? 1.0 : 0.0;
    this.buffer[1] = Number(frame.resonance ?? 0.0);
    this.buffer[2] = Number(frame.ubo_harmonic ?? 432.0);
    this.buffer[3] = Number(frame.vertebrae_count ?? 33);
    this.buffer[4] = m;
    this.buffer[5] = n;
    this.buffer[6] = frame.harmonic_lock ? 1.0 : 0.0;
    this.buffer[7] = Number(frame.focus_state ?? 12);
    this.buffer[8] = 0.0;
    this.buffer[9] = 0.0;
    this.buffer[10] = 0.0;
    this.buffer[11] = 0.0;
    return this.buffer;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state, this.buffer);
    return () => this.listeners.delete(fn);
  }

  connect() {
    if (this.source) return this.source;
    const es = new EventSource(this.url);
    es.addEventListener("telemetry", (ev) => {
      try {
        const frame = JSON.parse(ev.data);
        this.state = { ...this.state, ...frame };
        this.writeToBuffer(this.state);
        for (const fn of this.listeners) {
          fn(this.state, this.buffer);
        }
      } catch (err) {
        console.error("[ArohaTelemetryUBO] bad SSE frame:", err);
      }
    });
    es.onerror = (err) => {
      console.warn("[ArohaTelemetryUBO] SSE error/reconnect:", err);
    };
    this.source = es;
    return es;
  }

  disconnect() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }
}

export const telemetryUBO = new ArohaTelemetryUBO();
