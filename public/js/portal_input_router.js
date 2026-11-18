const FOCUS_OFFSETS = {
  10: 7.5,
  12: 4.0,
  15: 2.5,
  21: 1.5,
};

export function quantizeMidiToFocus(ccValue) {
  if (ccValue < 32) return 10;
  if (ccValue < 64) return 12;
  if (ccValue < 96) return 15;
  return 21;
}

export class PortalInputRouter {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.unlockEndpoint = options.unlockEndpoint || '/api/v1/portal/unlock';
    this.wsPath = options.wsPath || '/ws';
    this.boundCCs = new Set(options.defaultCCs || [74, 7, 1, 71]);
    this.learning = false;
    this.lastFocus = Number(engine?.lastState?.resonance?.focus_state ?? 12);
    this.onEvent = options.onEvent || (() => {});

    this.midiAccess = null;
    this.midiDevices = [];
    this.ws = null;
    this._postTimer = null;
    this._wsReconnectTimer = null;
  }

  armMidiLearn() {
    this.learning = true;
    this.onEvent({ type: 'midi_learn_armed' });
  }

  async initMIDI() {
    if (!navigator.requestMIDIAccess) {
      this.onEvent({ type: 'midi_unavailable', reason: 'Web MIDI API unsupported in this browser' });
      return [];
    }

    this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    const bindInputs = () => {
      this.midiDevices = [];
      for (const input of this.midiAccess.inputs.values()) {
        this.midiDevices.push(input.name || input.id);
        input.onmidimessage = (ev) => this._handleMidiMessage(ev, input.name || 'MIDI');
      }
      this.onEvent({
        type: 'midi_ports',
        devices: this.midiDevices,
        hasOxygen61: this.midiDevices.some((n) => /oxygen/i.test(n)),
      });
    };

    bindInputs();
    this.midiAccess.onstatechange = bindInputs;
    return this.midiDevices;
  }

  _handleMidiMessage(event, deviceName) {
    const [status, data1, data2] = event.data;
    const msgType = status & 0xf0;

    // 0xB0 = Control Change (Oxygen 61 faders, rotary knobs, transport/pad CCs)
    if (msgType !== 0xb0) return;

    const cc = data1;
    const val = data2;

    if (this.learning) {
      this.boundCCs.clear();
      this.boundCCs.add(cc);
      this.learning = false;
      this.onEvent({ type: 'midi_learned', cc, deviceName });
    }

    if (!this.boundCCs.has(cc)) return;

    const nextFocus = quantizeMidiToFocus(val);
    this.onEvent({ type: 'midi_cc', cc, val, focusState: nextFocus, deviceName });

    if (nextFocus !== this.lastFocus) {
      this.commitFocusState(nextFocus, `midi:cc${cc}`);
    }
  }

  initWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}${this.wsPath}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.onEvent({ type: 'ws_connected', url });
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'portal_state' && msg.resonance) {
          this._applyStateLocally(msg);
          this.onEvent({ type: 'ws_state', state: msg });
        }
      } catch (err) {
        console.warn('[PortalInputRouter] Invalid WS JSON:', err);
      }
    };

    this.ws.onclose = () => {
      this.onEvent({ type: 'ws_disconnected' });
      clearTimeout(this._wsReconnectTimer);
      this._wsReconnectTimer = setTimeout(() => this.initWebSocket(), 2000);
    };
  }

  _applyStateLocally(statePayload) {
    const res = statePayload.resonance || {};
    const focus = Number(res.focus_state ?? this.lastFocus);
    this.lastFocus = focus;

    this.engine.lastState = {
      ...(this.engine.lastState || {}),
      ...statePayload,
      status: statePayload.status || 'unlocked',
      resonance: {
        vertebrae_count: 33,
        chladni_mode: [5, 7],
        harmonic_lock: true,
        carrier_hz: 136.1,
        ...res,
        focus_state: focus,
        binaural_offset_hz: Number(res.binaural_offset_hz ?? FOCUS_OFFSETS[focus] ?? 4.0),
      },
    };

    // Immediate local oscillator retune so Web Audio + UBO react on the next frame
    if (this.engine.isRunning && this.engine.ctx && this.engine.leftOsc && this.engine.rightOsc) {
      const tuning = this.engine.computeChannels(this.engine.lastState.resonance);
      const now = this.engine.ctx.currentTime;
      this.engine.leftOsc.frequency.setTargetAtTime(tuning.leftHz, now, 0.03);
      this.engine.rightOsc.frequency.setTargetAtTime(tuning.rightHz, now, 0.03);
    }
  }

  commitFocusState(focusState, source = 'ui') {
    const prevRes = this.engine?.lastState?.resonance || {};
    const body = {
      vertebrae_count: Number(prevRes.vertebrae_count ?? 33),
      chladni_mode: Array.isArray(prevRes.chladni_mode) ? prevRes.chladni_mode : [5, 7],
      harmonic_lock: true,
      focus_state: Number(focusState),
    };

    // 1. Optimistic update for <16ms UBO shader response
    this._applyStateLocally({
      status: 'unlocked',
      gateway: 'zenith_26',
      token: 'aroha-33-verified',
      resonance: {
        ...body,
        carrier_hz: 136.1,
        binaural_offset_hz: FOCUS_OFFSETS[focusState] ?? 4.0,
      },
    });

    // 2. Debounced POST to /api/v1/portal/unlock for disk ledger persistence + WS fanout
    clearTimeout(this._postTimer);
    this._postTimer = setTimeout(async () => {
      try {
        const res = await fetch(this.unlockEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const confirmed = await res.json();
        if (confirmed.status === 'unlocked') {
          this._applyStateLocally(confirmed);
          this.onEvent({ type: 'post_confirmed', source, state: confirmed });
        }
      } catch (err) {
        this.onEvent({ type: 'post_error', error: err.message });
      }
    }, 120);
  }
}