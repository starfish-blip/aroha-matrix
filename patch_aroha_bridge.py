import pathlib
root = pathlib.Path(r"C:\Users\terry\aroha-matrix")

def backup(p):
    try:
        if p.exists():
            bdir = root / "_backups"
            bdir.mkdir(exist_ok=True)
            bak = bdir / (p.name + ".bak")
            if not bak.exists():
                bak.write_bytes(p.read_bytes())
                print(f"backup: {bak.name}")
    except Exception as e:
        print(f"backup skipped: {e}")

# 1 piano-cascade.html
p = root / "piano-cascade.html"
if p.exists():
    backup(p)
    t = p.read_text(encoding="utf-8")
    if "AROHA TELEMETRY BRIDGE" in t:
        print("piano-cascade.html already patched")
    else:
        bridge = """
  // === AROHA TELEMETRY BRIDGE ===
  const arohaChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('aroha-telemetry') : null;
  function publishMidiToAroha(midi, velocity, kind) {
    const evt = { type: 'aroha-midi', midi, velocity, kind, freq: midiToFreq(midi), ts: Date.now() };
    window.__AROHA_LAST_MIDI__ = evt;
    window.dispatchEvent(new CustomEvent('aroha-midi', { detail: evt }));
    try { if (arohaChannel) arohaChannel.postMessage(evt); } catch (e) {}
    try {
      fetch('http://127.0.0.1:8000/api/midi-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ midi, velocity, kind }),
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
  }
"""
        anchor = "  const pressedKeys = new Set(); // live user MIDI/mouse keys"
        if anchor in t:
            t = t.replace(anchor, bridge + "\n" + anchor)
            print("added bridge to piano")
        else:
            print("WARNING: piano anchor not found")
        old_on = "    pressedKeys.add(midi);\n    triggerVoice(midi, vel, false);"
        if old_on in t:
            t = t.replace(old_on, old_on + "\n    publishMidiToAroha(midi, vel, 'on');")
            print("hooked note on")
        old_off = "  function handleUserNoteOff(midi) {\n    pressedKeys.delete(midi);"
        if old_off in t:
            t = t.replace(old_off, old_off + "\n    publishMidiToAroha(midi, 0, 'off');")
            print("hooked note off")
        if 'href="checkin.html"' not in t and '<span class="pill">' in t:
            t = t.replace('<span class="pill">', '<a href="checkin.html" style="color:var(--cyan);text-decoration:none;font-size:0.78rem;letter-spacing:0.08em;">HUB</a><span class="pill">', 1)
            print("added HUB link to piano")
        p.write_text(t, encoding="utf-8")
        print("saved piano-cascade.html")
else:
    print("piano-cascade.html not found")

# 2 app.py
p = root / "app.py"
if p.exists():
    backup(p)
    t = p.read_text(encoding="utf-8")
    if "/api/midi-note" in t:
        print("app.py already patched")
    else:
        model = """
LAST_MIDI = {"midi": 60, "velocity": 0.0, "kind": "off", "freq": 261.63}

class MidiNoteRequest(BaseModel):
    midi: int = 60
    velocity: float = 0.8
    kind: str = "on"

"""
        if "class PortalUnlockRequest" in t:
            t = t.replace("class PortalUnlockRequest", model + "class PortalUnlockRequest", 1)
        else:
            t = model + t
        endpoint = """

@app.post("/api/midi-note")
async def midi_note(req: MidiNoteRequest):
    global LAST_MIDI
    LAST_MIDI = {"midi": req.midi, "velocity": req.velocity, "kind": req.kind, "freq": 440 * (2 ** ((req.midi - 69) / 12))}
    return {"ok": True, **LAST_MIDI}
"""
        t = t.rstrip() + "\n" + endpoint
        if '"midi_note":' not in t and '"lunar_illumination":' in t:
            lines = t.splitlines()
            for i, line in enumerate(lines):
                if '"lunar_illumination":' in line:
                    indent = line[:len(line) - len(line.lstrip())]
                    insert = [
                        indent + '"midi_note": LAST_MIDI["midi"],',
                        indent + '"midi_velocity": LAST_MIDI["velocity"],',
                        indent + '"midi_active": 1.0 if LAST_MIDI["kind"] == "on" else 0.0,',
                    ]
                    lines[i+1:i+1] = insert
                    print("added midi to telemetry broadcast")
                    break
            t = "\n".join(lines) + "\n"
        p.write_text(t, encoding="utf-8")
        print("saved app.py")
else:
    print("app.py not found")

# 3 checkin.html
p = root / "checkin.html"
if p.exists():
    backup(p)
    t = p.read_text(encoding="utf-8")
    if "piano-cascade.html" in t:
        print("checkin.html already has piano link")
    else:
        card = """
<div style="margin:12px;padding:14px;border:1px solid rgba(0,240,255,0.3);border-radius:10px;">
  <a href="piano-cascade.html" style="color:#00f0ff;text-decoration:none;font-weight:700;letter-spacing:0.08em;">AROHA // PIANO CASCADE</a>
  <div style="color:#7a8ba8;font-size:0.85rem;margin-top:4px;">61-key MIDI cascade, Oxygen 61, .MID + .WAV sync, Wait Mode</div>
</div>
"""
        if "</body>" in t:
            t = t.replace("</body>", card + "\n</body>", 1)
        else:
            t = t + card
        p.write_text(t, encoding="utf-8")
        print("saved checkin.html")
else:
    print("checkin.html not found")

# 4 chladni
p = root / "src/components/chladni-nodal-visualizer.js"
if p.exists():
    backup(p)
    t = p.read_text(encoding="utf-8")
    if "__AROHA_CHLADNI_BRIDGE__" in t:
        print("chladni already patched")
    else:
        bridge2 = """
// === AROHA MIDI -> CHLADNI BRIDGE (auto-added) ===
if (!window.__AROHA_CHLADNI_BRIDGE__) {
  window.__AROHA_CHLADNI_BRIDGE__ = true;
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('aroha-telemetry') : null;
  const applyMidi = (m) => {
    window.__AROHA_LAST_MIDI__ = m;
    try {
      const targets = [window.__AROHA_CHLADNI__, window.chladni, window.chladniVisualizer].filter(Boolean);
      for (const tg of targets) {
        if ('chladniMode' in tg) tg.chladniMode = 3 + (m.midi % 5);
        if ('excitation' in tg) tg.excitation = m.kind === 'on' ? m.velocity : 0;
        if ('mode' in tg) tg.mode = 3 + (m.midi % 5);
      }
    } catch (e) {}
  };
  if (bc) bc.onmessage = (e) => { if (e.data && e.data.type === 'aroha-midi') applyMidi(e.data); };
  window.addEventListener('aroha-midi', (e) => applyMidi(e.detail));
}
"""
        t = bridge2 + "\n" + t
        p.write_text(t, encoding="utf-8")
        print("saved chladni-nodal-visualizer.js")
else:
    print("chladni file not found, skipped")

print("DONE - all files patched")