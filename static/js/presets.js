// presets.js - Preset Manager for Workstation States
export class PresetManager {
    constructor() {
        this.storageKey = 'aroha_presets_v34';
    }

    savePreset(name, state) {
        const presets = this.getAllPresets();
        presets[name] = {
            ...state,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(presets));
        console.log(Preset '\' saved successfully.);
    }

    loadPreset(name) {
        const presets = this.getAllPresets();
        return presets[name] || null;
    }

    getAllPresets() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    getPresetNames() {
        return Object.keys(this.getAllPresets());
    }
}
