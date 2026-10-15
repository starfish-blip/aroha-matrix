const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const queueDir = path.join(__dirname, '../config/queue');
if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });

console.log("Starting Auto Ha Continuous Clipboard Watcher Daemon...");
let lastContent = "";

function checkClipboard() {
    const cmd = 'powershell -command "Get-Clipboard"';
    exec(cmd, (err, stdout, stderr) => {
        if (!err && stdout) {
            const currentContent = stdout.trim();
            if (currentContent && currentContent !== lastContent) {
                lastContent = currentContent;
                const timestamp = Date.now();
                const clipFile = path.join(queueDir, `clip_${timestamp}.json`);
                
                const payload = {
                    id: timestamp,
                    content: currentContent,
                    capturedAt: new Date().toISOString(),
                    status: "pending_processing"
                };
                
                fs.writeFileSync(clipFile, JSON.stringify(payload, null, 2));
                console.log(`[CLIP CAPTURED & QUEUED] -> ${clipFile}`);
            }
        }
    });
}

setInterval(checkClipboard, 2000);
console.log("Clipboard watcher active. Polling buffer every 2 seconds...");
