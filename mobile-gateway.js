const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const LOG_FILE = path.join(__dirname, 'mobile_stream.log');

const server = http.createServer((req, res) => {
    // CORS headers for local phone access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/prompt') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] PHONE: ${body}\n`;
            
            console.log(`\x1b[32m[INCOMING PHONE PROMPT]\x1b[0m ${body}`);
            fs.appendFileSync(LOG_FILE, logEntry);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'received', message: body }));
        });
    } else if (req.method === 'GET' && req.url === '/') {
        // Minimal HTML interface served directly to your phone browser
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hermes Phone Gateway</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: monospace; padding: 20px; margin: 0; }
                h2 { color: #38bdf8; }
                textarea { width: 100%; height: 120px; background: #1e293b; color: #fff; border: 1px solid #475569; padding: 10px; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
                button { width: 100%; padding: 15px; margin-top: 10px; background: #0284c7; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; }
                #status { margin-top: 15px; color: #4ade80; }
            </style>
        </head>
        <body>
            <h2>HERMES PHONE GATEWAY</h2>
            <textarea id="input" placeholder="Speak or type prompt here..."></textarea>
            <button onclick="send()">TRANSMIT TO LAPTOP</button>
            <div id="status"></div>
            <script>
                async function send() {
                    const text = document.getElementById('input').value;
                    if(!text) return;
                    document.getElementById('status').innerText = 'Sending...';
                    await fetch('/prompt', { method: 'POST', body: text });
                    document.getElementById('status').innerText = 'Transmitted successfully.';
                    document.getElementById('input').value = '';
                }
            </script>
        </body>
        </html>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[36m==========================================\x1b[0m`);
    console.log(`\x1b[32mHERMES PHONE GATEWAY ACTIVE ON PORT ${PORT}\x1b[0m`);
    console.log(`\x1b[36m==========================================\x1b[0m`);
});
