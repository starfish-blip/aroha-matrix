const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3013;
const FASTAPI_HOST = '127.0.0.1';
const FASTAPI_PORT = 8000;

function proxyToFastAPI(req, res, targetPath) {
  const options = {
    hostname: FASTAPI_HOST,
    port: FASTAPI_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `${FASTAPI_HOST}:${FASTAPI_PORT}` }
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ status: 'error', service: 'aroha-matrix-proxy', error: err.message });
    }
  });
  req.pipe(proxyReq, { end: true });
}

app.use('/api', (req, res) => proxyToFastAPI(req, res, req.url || '/'));
app.use(['/docs', '/openapi.json', '/redoc'], (req, res) => proxyToFastAPI(req, res, req.originalUrl));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.get('/matrix-status', (req, res) => res.json({ status: 'online', service: 'aroha-matrix', port: PORT }));

server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});
  const targetPath = req.url.startsWith('/api/') ? req.url.slice(4) : req.url;
  const proxyReq = http.request({
    hostname: FASTAPI_HOST,
    port: FASTAPI_PORT,
    path: targetPath,
    method: 'GET',
    headers: { ...req.headers, host: `${FASTAPI_HOST}:${FASTAPI_PORT}`, connection: 'Upgrade', upgrade: 'websocket' }
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    proxySocket.on('error', () => {});
    let handshake = `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`;
    for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
      handshake += `${proxyRes.rawHeaders[i]}: ${proxyRes.rawHeaders[i + 1]}\r\n`;
    }
    socket.write(handshake + '\r\n');
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    if (head && head.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    if (!socket.destroyed) {
      socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  });
  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[aroha-matrix] Listening on ${PORT} -> ${FASTAPI_HOST}:${FASTAPI_PORT}`);
});
