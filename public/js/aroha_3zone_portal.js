import { PortalBinauralEngine } from '/js/portal_binaural.js';
import { PortalUBOBridge } from '/js/portal_ubo_bridge.js';
import { PortalInputRouter } from '/js/portal_input_router.js';

const VERT_SRC = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

export class ArohaPortalHud extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.engine = null;
    this.uboBridge = null;
    this.router = null;
    this._rafId = null;
  }

  async connectedCallback() {
    const mode = this.getAttribute('mode') || 'full';
    this.renderShell(mode);
    await this.bootPipeline();
  }

  disconnectedCallback() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.engine) this.engine.stop();
    if (this.uboBridge) this.uboBridge.dispose();
  }

  renderShell(mode) {
    const isDock = mode === 'dock';
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          color: #e2e8f0;
          box-sizing: border-box;
        }
        * { box-sizing: border-box; }
        .dock-bar {
          position: fixed;
          right: 14px;
          bottom: 14px;
          z-index: 9999;
          background: rgba(7, 11, 20, 0.94);
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 0.6rem 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
        }
        .dock-bar.hidden { display: none; }
        .workspace {
          display: ${isDock ? 'none' : 'grid'};
          grid-template-columns: 320px 1fr 350px;
          gap: 0.75rem;
          min-height: ${isDock ? '520px' : '100vh'};
          padding: 0.75rem;
          background: #04070f;
          ${isDock ? 'position: fixed; inset: 16px; z-index: 9998; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.85);' : ''}
        }
        .workspace.expanded { display: grid; }
        .zone {
          background: #0b1220;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          overflow-y: auto;
        }
        .zone-center {
          padding: 0;
          position: relative;
          overflow: hidden;
          min-height: 360px;
        }
        canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .overlay-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(3, 7, 18, 0.82);
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 0.45rem 0.65rem;
          font-size: 0.74rem;
          color: #5eead4;
        }
        h3 {
          margin: 0;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #94a3b8;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 0.4rem;
        }
        button, select, a.btn-link {
          background: #162033;
          color: #5eead4;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 0.48rem 0.7rem;
          font-family: inherit;
          font-size: 0.78rem;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          display: block;
          width: 100%;
        }
        button:hover, a.btn-link:hover { border-color: #5eead4; }
        button.crown-btn { color: #fbbf24; border-color: #78350f; }
        button.crown-btn:hover { border-color: #fbbf24; }
        pre {
          background: #030712;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 0.6rem;
          font-size: 0.73rem;
          line-height: 1.4;
          color: #94a3b8;
          margin: 0;
          white-space: pre-wrap;
        }
        #zenithBox { color: #34d399; border-color: #065f46; }
        #morseBox { color: #fbbf24; border-color: #422006; }
        #crownBox { color: #f472b6; border-color: #831843; }
        @media (max-width: 1040px) {
          .workspace { grid-template-columns: 1fr; height: auto; }
          .zone-center { min-height: 320px; }
        }
      </style>

      <div class="dock-bar ${isDock ? '' : 'hidden'}" id="dockBar">
        <span id="dockSummary" style="font-size:0.76rem;color:#5eead4;">AROHA 33-Portal: syncing...</span>
        <button id="btnExpandDock" style="width:auto;">Open 3-Zone HUD</button>
      </div>

      <div class="workspace" id="workspaceRoot">
        <section class="zone" aria-label="Zone 1 Gateway Controls">
          <h3>Zone 1 // Gateway &amp; MIDI Matrix</h3>
          ${isDock ? '<button id="btnCollapseDock">Minimize to Dock</button>' : ''}
          <button id="btnStart">1. Start Dichotic Audio + Morse</button>
          <button id="btnMidiLearn">2. Oxygen 61 MIDI Learn</button>
          <select id="focusSelect">
            <option value="10">Focus 10 (7.5 Hz Theta)</option>
            <option value="12" selected>Focus 12 (4.0 Hz Theta-Delta)</option>
            <option value="15">Focus 15 (2.5 Hz Delta)</option>
            <option value="21">Focus 21 (1.5 Hz Epsilon)</option>
          </select>
          <select id="modeSelect">
            <option value="5,7" selected>Step 1: Chladni [5, 7]</option>
            <option value="6,8">Step 2: Chladni [6, 8]</option>
            <option value="7,9">Step 3: Chladni [7, 9]</option>
            <option value="4,9">Step 4: Chladni [4, 9] (Zenith)</option>
          </select>
          <button id="btnTransmit">3. Transmit Focus + Mode</button>
          <button id="btnResetSeq">Reset 4-Step Sequence</button>
          <button id="btnStop">Fade Out Audio</button>
          <pre id="ioBox">MIDI: scanning... | WS: connecting...</pre>
        </section>

        <section class="zone zone-center" aria-label="Zone 2 WebGL2 Chladni Resonator">
          <canvas id="glCanvas"></canvas>
          <div class="overlay-badge" id="centerBadge">Zone 2 // WebGL2 std140 UBO (64 B)</div>
        </section>

        <section class="zone" aria-label="Zone 3 Maramataka & Phase 3 Crown">
          <h3>Zone 3 // Zenith &amp; Phase 3 Crown</h3>
          <pre id="zenithBox">Phase 2 Sequence: loading...</pre>
          <pre id="morseBox">Phase 2 Morse: awaiting audio...</pre>
          <button id="btnManifestCrown" class="crown-btn">Manifest Phase 3 Crown Reward</button>
          <a id="btnDownloadPreset" class="btn-link" href="#" style="display:none;" download="aroha-zenith-26-synth-preset.json">
            Download Zenith-26 Synth Preset (.json)
          </a>
          <pre id="crownBox">Phase 3 Crown: locked behind aroha-zenith-26-master</pre>
          <pre id="uboBox">std140 Telemetry: initializing...</pre>
        </section>
      </div>
    `;
  }

  async bootPipeline() {
    const root = this.shadowRoot;
    const canvas = root.getElementById('glCanvas');
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) {
      root.getElementById('centerBadge').textContent = 'WebGL2 unavailable in this browser context';
      return;
    }

    const compileShader = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };

    const fragSrc = await (await fetch('/shaders/chladni_portal.frag')).text();
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const focusSelect = root.getElementById('focusSelect');
    const modeSelect = root.getElementById('modeSelect');
    const zenithBox = root.getElementById('zenithBox');
    const morseBox = root.getElementById('morseBox');
    const crownBox = root.getElementById('crownBox');
    const ioBox = root.getElementById('ioBox');
    const uboBox = root.getElementById('uboBox');
    const dockSummary = root.getElementById('dockSummary');
    const btnDownloadPreset = root.getElementById('btnDownloadPreset');

    const syncUI = (state) => {
      if (!state) return;
      const res = state.resonance || {};
      const prog = state.phase2_progression || {};
      if (res.focus_state) focusSelect.value = String(res.focus_state);
      if (Array.isArray(res.chladni_mode)) modeSelect.value = res.chladni_mode.join(',');

      const nextMode = Array.isArray(prog.next_expected_mode) ? `[${prog.next_expected_mode.join(', ')}]` : 'COMPLETE';
      zenithBox.textContent =
        `Phase 1 Token : ${state.token || 'LOCKED'}\n` +
        `Phase 2 Step  : ${prog.step_index ?? 0}/${prog.total_steps ?? 4} (${prog.phase2_status || 'awaiting'})\n` +
        `Next Mode     : ${nextMode}\n` +
        `Zenith Token  : ${state.phase2_token || 'LOCKED'}`;

      if (dockSummary) {
        dockSummary.textContent = `AROHA Portal: Focus ${res.focus_state ?? 12} | Zenith ${prog.step_index ?? 0}/4`;
      }

      if (state.phase2_token === 'aroha-zenith-26-master') {
        btnDownloadPreset.style.display = 'block';
        btnDownloadPreset.href = `/api/v1/portal/phase3/preset.json?token=${encodeURIComponent(state.phase2_token)}`;
      } else {
        btnDownloadPreset.style.display = 'none';
      }

      if (state.phase3_crown && state.phase3_token) {
        const sm = state.phase3_crown.star_map_coordinates || {};
        const sp = state.phase3_crown.synth_preset || {};
        crownBox.textContent =
          `Phase 3 Token : ${state.phase3_token}\n` +
          `Star-Map      : ${sm.sector} (RA ${sm.ra_hours}h / Dec ${sm.dec_deg}°)\n` +
          `Maramataka    : ${sm.maramataka_phase}\n` +
          `Synth Patch   : ${sp.dichotic_left_hz} / ${sp.dichotic_right_hz} Hz
` +
          `Overtone Bank : ${(sp.harmonic_ratios || []).join('x, ')}x`;
      } else {
        crownBox.textContent = 'Phase 3 Crown: locked behind aroha-zenith-26-master';
      }
    };

    this.engine = new PortalBinauralEngine('/api/v1/portal/state', {
      morseEnabled: true,
      morseLoop: true,
      onMorseEvent: (ev) => {
        if (ev.type === 'morse_started') {
          morseBox.textContent = `[${ev.cipherId}] @ ${ev.beaconHz} Hz\n"${ev.plaintext}"\n${ev.encoded}`;
        } else if (ev.type === 'morse_char') {
          morseBox.textContent = `[${ev.cipherId}] Keying '${ev.char}' (${ev.pattern})\n"${ev.plaintext}"`;
        } else if (ev.type === 'morse_stopped') {
          morseBox.textContent = 'Phase 2 Morse: idle';
        }
      },
    });

    const initial = await this.engine.fetchPortalState().catch(() => null);
    syncUI(initial);

    this.uboBridge = new PortalUBOBridge(gl, program, this.engine, {
      blockName: 'ArohaHarmonicBlock',
      bindingPoint: 0,
    });

    let midiLine = 'MIDI: none';
    let wsLine = 'WS: connecting';
    let lastEv = 'Ready';
    const updateIo = () => {
      ioBox.textContent = `${midiLine}\n${wsLine}\n${lastEv}`;
    };

    this.router = new PortalInputRouter(this.engine, {
      defaultCCs: [74, 7, 1, 71],
      onEvent: (ev) => {
        if (ev.type === 'midi_ports') {
          midiLine = ev.devices.length ? `MIDI: ${ev.devices.join(', ')}` : 'MIDI: none';
        } else if (ev.type === 'midi_unavailable') {
          midiLine = 'MIDI: unavailable';
        } else if (ev.type === 'midi_learn_armed') {
          lastEv = 'Move Oxygen 61 fader/knob...';
        } else if (ev.type === 'midi_learned') {
          lastEv = `Bound CC #${ev.cc}`;
        } else if (ev.type === 'midi_cc') {
          lastEv = `CC #${ev.cc}=${ev.val} -> Focus ${ev.focusState}`;
        } else if (ev.type === 'ws_connected') {
          wsLine = 'WS: connected (/ws)';
        } else if (ev.type === 'ws_disconnected') {
          wsLine = 'WS: reconnecting...';
        } else if (ev.type === 'ws_state') {
          if (ev.state?.phase3_crown && ev.state?.phase3_token === 'aroha-crown-33-starmap' && this.engine.isRunning) {
            this.engine.applyCrownPreset(ev.state.phase3_crown).catch(() => false);
          }
          syncUI(ev.state);
          lastEv = `WS (${ev.state.source})`;
          if (this.engine.isRunning && this.engine.morseEnabled && ev.state?.phase2_hint) {
            this.engine.playMorseHint(ev.state.phase2_hint);
          }
        } else if (ev.type === 'post_confirmed') {
          syncUI(ev.state);
          lastEv = `Saved #${ev.state.ledger_count}`;
        }
        updateIo();
      },
    });

    await this.router.initMIDI();
    this.router.initWebSocket();

    const transmit = async (resetSequence = false) => {
      const focusState = Number(focusSelect.value);
      const chladniMode = modeSelect.value.split(',').map(Number);
      const res = await fetch('/api/v1/portal/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertebrae_count: 33,
          chladni_mode: chladniMode,
          harmonic_lock: true,
          focus_state: focusState,
          reset_sequence: resetSequence,
        }),
      });
      const data = await res.json();
      this.engine.lastState = data;
      syncUI(data);
      if (this.engine.isRunning) await this.engine.syncLive();
    };

    root.getElementById('btnStart').addEventListener('click', async () => {
      const { state } = await this.engine.startFromPortal(0.22);
      syncUI(state);
    });
    root.getElementById('btnTransmit').addEventListener('click', () => transmit(false));
    root.getElementById('btnResetSeq').addEventListener('click', () => {
      modeSelect.value = '5,7';
      transmit(true);
    });
    root.getElementById('btnStop').addEventListener('click', () => this.engine.stop());
    root.getElementById('btnMidiLearn').addEventListener('click', () => this.router.armMidiLearn());

    root.getElementById('btnManifestCrown').addEventListener('click', async () => {
      const p2Token = this.engine?.lastState?.phase2_token || null;
      const res = await fetch('/api/v1/portal/phase3/crown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase2_token: p2Token }),
      });
      const payload = await res.json();
      if (!res.ok) {
        crownBox.textContent = `Blocked (${res.status}): ${payload.detail}`;
        return;
      }
      this.engine.lastState = payload;
      await this.engine.applyCrownPreset(payload.phase3_crown).catch(() => false);
      syncUI(payload);
    });

    const btnExpand = root.getElementById('btnExpandDock');
    const btnCollapse = root.getElementById('btnCollapseDock');
    const workspaceRoot = root.getElementById('workspaceRoot');
    if (btnExpand) {
      btnExpand.addEventListener('click', () => workspaceRoot.classList.add('expanded'));
    }
    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => workspaceRoot.classList.remove('expanded'));
    }

    let lastHudMs = 0;
    const loop = (nowMs) => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      const u = this.uboBridge.update(nowMs);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (nowMs - lastHudMs > 140) {
        lastHudMs = nowMs;
        uboBox.textContent =
          `std140 ArohaHarmonicBlock\n` +
          `mode=[${u[0]},${u[1]}] fc=${u[2].toFixed(1)}Hz Δf=${u[3].toFixed(2)}Hz\n` +
          `rms=${u[4].toFixed(3)} phase=${u[6].toFixed(3)} focus=${u[8]}`;
      }
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
}

if (!customElements.get('aroha-portal-hud')) {
  customElements.define('aroha-portal-hud', ArohaPortalHud);
}