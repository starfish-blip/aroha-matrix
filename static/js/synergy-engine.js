class AROHASynergyEngine {
    constructor() {
        this.activeMultiplier = 1.0;
    }

    // Emergent feedback: Hardware fader input + Audio level -> Cross-coupled visual pulse & turbulence
    processSynergy(faderIdx, dbValue, audioLevel, visualizer, themeEngine) {
        if (!visualizer || !visualizer.layers) return;

        // Non-linear emergence: higher fader boosts trigger exponential visual expansion
        const intensity = Math.pow(10, dbValue / 20);
        this.activeMultiplier = 1.0 + (intensity * 2.5) + (audioLevel * 1.5);

        // Dynamically modulate particle turbulence based on overall system energy
        if (typeof visualizer.setTurbulence === 'function') {
            visualizer.setTurbulence(Math.min(3.0, Math.max(0.2, this.activeMultiplier)));
        }

        // Shift color hues dynamically when crossing energy thresholds
        if (intensity > 0.5 && themeEngine) {
            const themes = ['ocean', 'solar', 'nebula', 'matrix'];
            const targetTheme = themes[faderIdx % themes.length];
            themeEngine.applyTheme(targetTheme, visualizer.layers);
        }
    }
}

window.synergyEngine = new AROHASynergyEngine();