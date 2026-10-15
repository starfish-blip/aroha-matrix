const fs = require('fs');
const path = require('path');
const queueDir = path.join(__dirname, 'config', 'queue');
const processedDir = path.join(__dirname, 'config', 'processed');
const errorDir = path.join(__dirname, 'config', 'error');

console.log("Sandbox processor started. Watching queue...");

setInterval(() => {
    fs.readdir(queueDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(queueDir, file);
            if (!file.startsWith('clip_')) {
                console.log('[Error] File rejected (missing clip_ prefix): ' + file);
                fs.renameSync(filePath, path.join(errorDir, file));
                return;
            }
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                JSON.parse(content);
                fs.renameSync(filePath, path.join(processedDir, file));
                console.log('[Success] Processed and moved: ' + file);
            } catch (parseErr) {
                console.log('[Error] Malformed JSON in: ' + file);
                fs.renameSync(filePath, path.join(errorDir, file));
            }
        });
    });
}, 2000);
