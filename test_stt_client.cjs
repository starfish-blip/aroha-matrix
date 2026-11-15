const WebSocket = require('ws');

const wsUrl = 'ws://localhost:8001/ws/stt'; // Adjust port/endpoint as configured for your FastAPI backend
console.log([*] Connecting to WebSocket bridge at \...);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('[+] Connected to AROHA WebSocket bridge. Sending test STT packet...');
    const testPayload = JSON.stringify({
        client: 'terrys-s24-ultra',
        timestamp: new Date().toISOString(),
        transcript: 'AROHA matrix zenith alignment verified.',
        confidence: 0.98
    });
    ws.send(testPayload);
});

ws.on('message', (data) => {
    console.log([+] Received server response: \);
    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 1000);
});

ws.on('error', (error) => {
    console.error('[-] WebSocket connection error:', error.message);
});

ws.on('close', () => {
    console.log('[*] WebSocket connection closed.');
});
