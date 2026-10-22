const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    console.log(`[Mesh] Client connected: ${socket.id}`);

    // Relay control state changes across all connected mesh nodes (PC, Phone, Tablet)
    socket.on('aroha-state-sync', (data) => {
        socket.broadcast.emit('aroha-state-sync', data);
    });

    socket.on('disconnect', () => {
        console.log(`[Mesh] Client disconnected: ${socket.id}`);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AROHA v34 Mesh] Active on port ${PORT}`);
    console.log(`[Mesh] Access locally or via Tailscale mesh IP on port ${PORT}`);
});
