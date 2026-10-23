'use client';
import { useEffect, useRef } from 'react';
import { useEngineStore } from '@/store/useEngineStore';

export default function ResonanceVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeFrequency, mode } = useEngineStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let time = 0;
    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const nodes = mode === 'sandbox' ? 4 : 12; 
      ctx.beginPath();
      for (let i = 0; i < Math.PI * 2; i += 0.05) {
        const radius = 100 + Math.sin(i * nodes + time) * (activeFrequency / 10);
        const x = centerX + Math.cos(i) * radius;
        const y = centerY + Math.sin(i) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = mode === 'sandbox' ? '#00f0ff' : '#ff003c';
      ctx.lineWidth = 2;
      ctx.stroke();
      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [activeFrequency, mode]);

  return (
    <canvas ref={canvasRef} width={600} height={400} className="rounded-xl border border-gray-800 bg-black/50 shadow-2xl backdrop-blur-md" />
  );
}
