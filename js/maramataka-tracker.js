window.ArohaMaramataka = {
    phases: [
        { name: "Whiro", energy: "Rest & Plan", action: "Internal reflection, avoid major planting or new starts." },
        { name: "Tirea", energy: "New Spark", action: "Light tasks, clearing space." },
        { name: "Oho", energy: "Awakening", action: "Setting intentions." },
        { name: "Tamatea", energy: "Unpredictable / Dynamic", action: "High energy winds/currents - use caution." },
        { name: "Rākaunui", energy: "Full Moon / Peak Power", action: "Maximum abundance, high execution, community gathering." },
        { name: "Mutuwhenua", energy: "Completion", action: "Wrapping up cycles, rest before renewal." }
    ],
    getCurrentPhase() {
        // Simplified lunar day simulator or real calc hook
        const day = new Date().getDate() % this.phases.length;
        return this.phases[day];
    }
};

window.ArohaTrackers = {
    buckets: {
        activeTasks: ["Refactor Shader Pipeline", "Calibrate 432Hz Faders", "Sync MIDI Hardware"],
        completedTasks: ["Initialize Modular Environment", "Setup Express Backend"]
    },
    logTracker(category, message) {
        console.log(`[AROHA TRACKER // ${category}] ${message}`);
    }
};
