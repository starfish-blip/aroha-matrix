const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3013;
const FASTAPI_URL = 'http://127.0.0.1:8000';

// 1. Proxy REST API requests using single-options object syntax for HPM v3
app.use('/api', createProxyMiddleware({
    target: FASTAPI_URL,
    changeOrigin: true,
    secure: false
}));

// 2. Configure WebSocket proxy middleware for real-time telemetry
const wsProxy = createProxyMiddleware({
    target: FASTAPI_URL,
    changeOrigin: true,
    ws: true,
    secure: false
});

app.use('/ws', wsProxy);

// 3. Handle WebSocket upgrade events explicitly on the HTTP server
server.on('upgrade', (req, socket, head) => {
    wsProxy.upgrade(req, socket, head);
});

// 4. Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', proxy: 'active', target: FASTAPI_URL });
});

server.listen(PORT, () => {
    console.log(`[Express] Gateway running on port ${PORT} -> Proxying API & WebSockets to ${FASTAPI_URL}`);
});
