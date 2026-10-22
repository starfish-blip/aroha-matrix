// agentWatcher.js - Autonomous Local Build & Sync Agent
const fs = require('fs');
const path = require('path');

const watchDir = path.join(__dirname, 'static', 'js');
console.log('?? AROHA Agent Watcher active. Monitoring ' + watchDir + ' for changes...');

fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (filename) {
        console.log("[AROHA] Detected update. Re-indexing workstation modules...");}
});
