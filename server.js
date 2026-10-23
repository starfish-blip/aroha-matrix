const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const http = require('http');

const app = express();
const PORT = 3013;
const OLLAMA_PORT = 11434;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const patchesDir = path.join(__dirname, 'patches');
const audioDir = path.join(__dirname, 'audio_recordings');
if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir);
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

// 1. Save Patch Manifests
app.post('/api/save-patch', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Missing name or data' });
    const filePath = path.join(patchesDir, `AROHA_manifest_${name}.json`);
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save patch' });
        console.log(`[+] Saved Patch: ${filePath}`);
        res.json({ status: 'success', path: filePath });
    });
});

// 2. Save Audio Recordings
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, audioDir),
    filename: (req, file, cb) => cb(null, `AROHA_Recording_${Date.now()}.webm`)
});
const upload = multer({ storage });

app.post('/api/save-audio', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file received' });
    console.log(`[+] Saved Audio: ${req.file.path}`);
    res.json({ status: 'success', path: req.file.path });
});

// 3. Local Ollama AI Proxy Route
app.post('/api/ai-reflect', (req, res) => {
    const { prompt, model = 'qwen2.5-coder' } = req.body;
    
    const ollamaData = JSON.stringify({
        model: model,
        prompt: `You are AROHA, a human-centered reflective companion built on care, resonance, and awareness. Respond concisely and insightfully to this reflection prompt: ${prompt}`,
        stream: false
    });

    const ollamaReq = http.request({
        hostname: 'localhost',
        port: OLLAMA_PORT,
        path: '/api/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ollamaData)
        }
    }, (ollamaRes) => {
        let data = '';
        ollamaRes.on('data', chunk => data += chunk);
        ollamaRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                res.json({ status: 'success', response: parsed.response });
            } catch (e) {
                res.status(500).json({ error: 'Invalid JSON response from Ollama' });
            }
        });
    });

    ollamaReq.on('error', (e) => {
        console.error('Ollama connection error:', e.message);
        res.status(500).json({ error: 'Local Ollama service unreachable on port 11434' });
    });

    ollamaReq.write(ollamaData);
    ollamaReq.end();
});

app.listen(PORT, () => {
    console.log(`======================================`);
    console.log(`  AROHA MATRIX BACKEND ONLINE (v2.0)  `);
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`  Ollama AI Proxy Hooked (Port 11434) `);
    console.log(`======================================`);
});
