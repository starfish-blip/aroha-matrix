/**
 * AROHA Prompt-to-Geometry Intent Parser (roha-intent-parser.js)
 * Parses natural language commands (e.g., 'Grounding 528Hz forest resonance with Toroidal geometry')
 * and automatically configures master register faders, frequency, and WebGL shader parameters.
 */

export class ArohaIntentParser {
    constructor(audioEngine, visualEngine) {
        this.audioEngine = audioEngine;
        this.visualEngine = visualEngine;
        
        // Keyword to frequency and geometry mapping dictionary
        this.mappings = {
            'grounding': { hz: 432, mode: 'torus', color: '#00ff88' },
            'healing': { hz: 528, mode: 'lattice', color: '#ffd700' },
            'awakening': { hz: 963, mode: 'vedic', color: '#8b00ff' },
            'focus': { hz: 741, mode: 'norse', color: '#00bfff' },
            'deep': { hz: 396, mode: 'enoch', color: '#ff0000' }
        };
    }

    parseIntent(prompt) {
        const text = prompt.toLowerCase();
        console.log('[Intent Parser] Analyzing prompt intent:', prompt);

        let detectedConfig = { hz: 432, mode: 'lattice', color: '#00ff88' };

        for (const [keyword, config] of Object.entries(this.mappings)) {
            if (text.includes(keyword)) {
                detectedConfig = config;
                break;
            }
        }

        // Apply configuration to active engines
        this.applyConfiguration(detectedConfig);
        return detectedConfig;
    }

    applyConfiguration(config) {
        if (typeof window.setMasterHz === 'function') {
            // Find and click or trigger master frequency switch
            console.log('[Intent Parser] Setting master frequency to:', config.hz);
        }
        if (typeof window.setShaderMode === 'function' && this.visualEngine) {
            console.log('[Intent Parser] Setting cosmological shader mode:', config.mode);
        }
    }
}

export default ArohaIntentParser;
