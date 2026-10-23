'use client';
import { useEngineStore } from '@/store/useEngineStore';
import ResonanceVisualizer from '@/components/ResonanceVisualizer';
import { motion } from 'framer-motion';

export default function EngineWorkspace() {
  const { mode, setMode, xp, addXP, setFrequency, activeFrequency } = useEngineStore();

  const playTone = (freq: number) => {
    setFrequency(freq);
    addXP(10);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mode === 'sandbox' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  return (
    <main className={min-h-screen p-8 transition-colors duration-700 }>
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold tracking-widest text-white">{mode === 'sandbox' ? 'SANDBOX MODE' : 'PRO STUDIO'}</h1>
        <div className="flex gap-4 items-center">
          <span className="text-emerald-400 font-mono text-sm">XP: {xp}</span>
          <button onClick={() => setMode(mode === 'sandbox' ? 'pro' : 'sandbox')} className="px-4 py-2 border border-gray-700 rounded-lg text-white hover:bg-white/10">Toggle Mode</button>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="flex flex-col items-center justify-center">
          <ResonanceVisualizer />
          <p className="mt-4 text-gray-400 font-mono">Active Freq: {activeFrequency}Hz</p>
        </section>
        <section className="flex flex-wrap content-center gap-4">
          {[432, 528, 639, 741, 852].map((freq) => (
            <motion.button key={freq} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => playTone(freq)} className={w-32 h-32 rounded-2xl flex items-center justify-center text-xl font-bold transition-all }>{freq}Hz</motion.button>
          ))}
        </section>
      </div>
    </main>
  );
}
