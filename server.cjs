const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3013;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const upload = multer({ dest: 'audio_recordings/' });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/save-patch', (req, res) => {
    const { name, data } = req.body;
    const filename = `patches/${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    res.json({ status: 'success', file: filename });
});

app.post('/api/save-audio', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No audio file' });
    const targetPath = path.join(__dirname, 'audio_recordings', `session_${Date.now()}.webm`);
    fs.renameSync(req.file.path, targetPath);
    res.json({ status: 'success', path: targetPath });
});

app.post('/api/ai-reflect', async (req, res) => {
    const { prompt } = req.body;
    res.json({ status: 'success', response: `AROHA Matrix Echo: Reflected upon '${prompt}'. Resonance stable at 432Hz.` });
});

app.listen(PORT, () => {
    console.log(`[✓] AROHA Omni-Matrix running live at http://localhost:${PORT}`);
});
