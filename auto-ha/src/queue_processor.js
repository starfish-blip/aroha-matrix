const fs = require('fs');
const path = require('path');

const queueDir = path.join(__dirname, '../config/queue');
const processedDir = path.join(__dirname, '../config/processed');

if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

console.log("Starting Auto Ha Queue Processor Daemon...");

function processQueue() {
    fs.readdir(queueDir, (err, files) => {
        if (err) {
            console.error("Error reading queue directory:", err.message);
            return;
        }

        const jsonFiles = files.filter(f => f.endsWith('.json'));
        if (jsonFiles.length === 0) return;

        console.log(`[DISPATCH] Found ${jsonFiles.length} pending clip(s) in queue.`);

        for (const file of jsonFiles) {
            const filePath = path.join(queueDir, file);
            
            try {
                const rawData = fs.readFileSync(filePath, 'utf8');
                const clip = JSON.parse(rawData);

                console.log(`[PROCESSING] Clip ID ${clip.id} | Captured: ${clip.capturedAt}`);
                console.log(`--- Content Preview ---\n${clip.content.substring(0, 150)}...\n-----------------------`);

                clip.status = "dispatched";
                clip.processedAt = new Date().toISOString();

                const targetPath = path.join(processedDir, file);
                fs.writeFileSync(targetPath, JSON.stringify(clip, null, 2));
                fs.unlinkSync(filePath);

                console.log(`[SUCCESS] Clip ${clip.id} successfully dispatched and archived.`);
            } catch (parseErr) {
                console.error(`[ERROR] Failed to process file ${file}:`, parseErr.message);
            }
        }
    });
}

setInterval(processQueue, 3000);
console.log("Queue processor active. Scanning queue directory every 3 seconds...");
