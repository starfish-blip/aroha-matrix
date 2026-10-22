const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    socket.on('aroha-state-sync', (data) => {
        socket.broadcast.emit('aroha-state-sync', data);
    });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(Active on port );
    });
}

// Export the Express app handler for Vercel serverless execution
module.exports = app;
