import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [midiStatus, setMidiStatus] = useState('Waiting for input...');
  const [lastNote, setLastNote] = useState('None');
  const [faderValues, setFaderValues] = useState(Array(12).fill(0));
  const audioCtxRef = useRef(null);

  const nodes = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'];

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playTone = (freq) => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((midiAccess) => {
        for (let input of midiAccess.inputs.values()) {
          setMidiStatus('Connected: ' + input.name);
          input.onmidimessage = (event) => {
            const [status, note, velocity] = event.data;
            if ((status >> 4) === 9 && velocity > 0) {
              setLastNote('Note ' + note);
              const freq = 440 * Math.pow(2, (note - 69) / 12);
              playTone(freq);
            }
          };
        }
      }, () => {
        setMidiStatus('MIDI Access Failed');
      });
    }
  }, []);

  const handleFaderChange = (index, val) => {
    const updated = [...faderValues];
    updated[index] = Number(val);
    setFaderValues(updated);
  };

  return (
    <div onClick={initAudio} style={{ minHeight: '100vh', background: '#07090f', color: '#d0d8e8', fontFamily: 'Segoe UI, Tahoma, sans-serif', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'rgba(8, 12, 20, 0.95)', border: '1px solid #2a3f5f', borderRadius: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#00e5ff', letterSpacing: '1px' }}>AROHA MASTER MATRIX: WORKSTATION v1.0</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Cosmological Tuning // Web Audio & MIDI Active</p>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#00ff88' }}>ONLINE // STATUS: ACTIVE</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr 1fr', gap: '15px' }}>
        <div style={{ background: 'rgba(12, 18, 30, 0.92)', border: '1px solid #2a3f5f', borderRadius: '8px', padding: '15px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00e5ff' }}>FLOWER OF LIFE & PLATONIC SOLIDS</div>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>FREQ: 432.00 Hz // PATTERN: MERKABA-4</p>
        </div>
        <div style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, rgba(10,14,24,0.95) 80%)', border: '1px solid #2a3f5f', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00e5ff' }}>COSMIC SIGIL: ALCHEMIST</div>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Norse Cosmology, Book of Enoch & Vedic Decoded</p>
        </div>
        <div style={{ background: 'rgba(12, 18, 30, 0.92)', border: '1px solid #2a3f5f', borderRadius: '8px', padding: '15px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00e5ff' }}>ESOTERIC CARTOGRAPHY</div>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Lyra & Orion vortex mapping. Field: 2.41 T.</p>
        </div>
      </div>

      <div style={{ background: 'rgba(8, 12, 20, 0.95)', border: '1px solid #2a3f5f', borderRadius: '8px', padding: '15px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00e5ff', marginBottom: '10px' }}>12-OCTAVE FADER BANK // COSMOLOGICAL TUNING</div>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-around', overflowX: 'auto' }}>
          {nodes.map((name, i) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#00e5ff' }}>{faderValues[i]}dB</span>
              <input type='range' min='-12' max='12' value={faderValues[i]} onChange={(e) => handleFaderChange(i, e.target.value)} style={{ accentColor: '#00e5ff', width: '40px', height: '90px' }} orient='vertical' />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(8, 12, 20, 0.95)', border: '1px solid #2a3f5f', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>OXYGEN 61 // MIDI CONTROLLER &mdash; <span style={{ color: '#00ff88' }}>{midiStatus}</span></span>
          <span>LAST NOTE: <span style={{ color: '#ffb000' }}>{lastNote}</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', height: '65px', background: '#020617', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
          {Array.from({ length: 36 }, (_, idx) => {
            const noteNum = 48 + idx;
            const isBlack = [1, 3, 6, 8, 10].includes(noteNum % 12);
            const freq = 440 * Math.pow(2, (noteNum - 69) / 12);
            return (
              <div key={noteNum} onClick={() => { playTone(freq); setLastNote('Note ' + noteNum); }} style={{ position: isBlack ? 'absolute' : 'relative', background: isBlack ? '#0f172a' : '#f8fafc', border: '1px solid #020617', width: isBlack ? '10px' : '16px', height: isBlack ? '55%' : '100%', zIndex: isBlack ? 2 : 1, cursor: 'pointer', borderRadius: '0 0 3px 3px' }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
