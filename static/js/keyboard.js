// keyboard.js - Oxygen 61 / QWERTY Keyboard Mapping
import { playTone, initAudio } from './audioEngine.js';

export function setupKeyboard(containerId, onNotePlayed) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pattern = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const rootFreq = 130.81; // C3

    for (let i = 0; i < 36; i++) {
        const key = document.createElement('div');
        key.className = pattern[i % 12] === 1 ? 'key black' : 'key';
        const freq = rootFreq * Math.pow(2, i / 12);
        
        key.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            initAudio();
            playTone(freq, { type: 'sawtooth', duration: 0.7 });
            
            if (onNotePlayed) onNotePlayed(freq);

            key.classList.add('pressed');
            setTimeout(() => key.classList.remove('pressed'), 200);
        });
        container.appendChild(key);
    }
}
