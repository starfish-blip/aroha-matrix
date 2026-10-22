class AROHAMeshBridge {
    constructor() {
        this.socket = null;
        this.isSyncing = false;
    }

    init() {
        if (typeof io === 'undefined') {
            console.warn("[Mesh] Socket.io client library not loaded.");
            return;
        }

        this.socket = io();

        this.socket.on('connect', () => {
            console.log(`[Mesh] Connected to AROHA Mesh Node via ID: ${this.socket.id}`);
        });

        this.socket.on('aroha-state-sync', (data) => {
            this.isSyncing = true;
            this.applyRemoteState(data);
            this.isSyncing = false;
        });
    }

    broadcastState(key, value) {
        if (this.isSyncing || !this.socket) return;
        this.socket.emit('aroha-state-sync', { key, value });
    }

    applyRemoteState(data) {
        console.log(`[Mesh] Syncing state -> ${data.key}:`, data.value);
        const { key, value } = data;

        if (key === 'symmetry' && window.arohaVisualizer) {
            window.arohaVisualizer.setSymmetry(value);
            const el = document.getElementById('symmetry-select');
            if (el) el.value = value;
        } else if (key === 'turbulence' && window.arohaVisualizer) {
            window.arohaVisualizer.setTurbulence(value);
            const el = document.getElementById('turbulence-slider');
            if (el) el.value = value;
        } else if (key === 'theme' && window.themeEngine && window.arohaVisualizer) {
            window.themeEngine.applyTheme(value, window.arohaVisualizer.layers);
            const el = document.getElementById('theme-select');
            if (el) el.value = value;
        } else if (key === 'scale' && window.scaleEngine) {
            window.scaleEngine.setScale(value);
            const el = document.getElementById('scale-select');
            if (el) el.value = value;
        }
    }
}

window.meshBridge = new AROHAMeshBridge();
window.addEventListener('DOMContentLoaded', () => {
    window.meshBridge.init();
});