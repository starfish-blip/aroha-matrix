// faderBank.js - 12-Octave Cosmological Fader Bank
import { playTone, initAudio } from './audioEngine.js';

export function setupFaderBank(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const baseFrequencies = [110, 123.47, 130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63];
    const heights = [65, 80, 45, 90, 55, 70, 85, 50, 75, 88, 60, 95];

    heights.forEach((h, index) => {
        const track = document.createElement('div');
        track.className = 'fader-track';
        
        const thumb = document.createElement('div');
        thumb.className = 'fader-thumb';
        thumb.style.height = h + '%';
        
        track.appendChild(thumb);
        
        track.addEventListener('click', () => {
            initAudio();
            playTone(baseFrequencies[index], { type: 'triangle', duration: 1.0 });
            thumb.style.height = (Math.random() * 60 + 30) + '%';
        });

        container.appendChild(track);
    });
}
