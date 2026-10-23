import { create } from 'zustand';

interface EngineState {
  mode: 'sandbox' | 'pro';
  xp: number;
  activeFrequency: number;
  setMode: (mode: 'sandbox' | 'pro') => void;
  addXP: (amount: number) => void;
  setFrequency: (freq: number) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  mode: 'sandbox',
  xp: 0,
  activeFrequency: 432,
  setMode: (mode) => set({ mode }),
  addXP: (amount) => set((state) => ({ xp: state + amount })),
  setFrequency: (activeFrequency) => set({ activeFrequency }),
}));
