const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

console.log("[HERMES] Telemetry Daemon & Automation Engine initialized on port 8080");

wss.on("connection", (ws, req) => {
    console.log("[HERMES] Client connected: " + req.socket.remoteAddress);

    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(generateRawFrame());
        }
    }, 16);

    ws.on("message", (message) => {
        try {
            const taskPayload = JSON.parse(message);
            console.log("[HERMES] Received task payload:", taskPayload);
            executeTask(ws, taskPayload);
        } catch (err) {
            console.error("[HERMES] Failed to parse incoming message:", err.message);
        }
    });

    ws.on("close", () => clearInterval(interval));
});

let sequenceId = 0;
function generateRawFrame() {
    sequenceId++;
    const timeSec = Date.now() / 1000;
    const fundamental = 272.00 + Math.sin(timeSec * 2.5) * 5.0;
    const amplitude = 0.5 + Math.sin(timeSec * 5.0) * 0.45;

    return JSON.stringify({
        system_id: "AROHA-HERMES-01",
        sequence_id: sequenceId,
        resonance: {
            fundamental_hz: parseFloat(fundamental.toFixed(4)),
            amplitude: parseFloat(amplitude.toFixed(4)),
            phase_offset_rad: parseFloat(((timeSec * 1.5) % (2 * Math.PI)).toFixed(4))
        },
        adaptation_trigger: {
            target_component: "ui_fluidity_mesh",
            state_shift: amplitude > 0.85 ? "RESONANT_EXPANSION" : "NOMINAL_FLOW",
            intensity_scalar: parseFloat(amplitude.toFixed(4))
        }
    });
}

function executeTask(ws, task) {
    if (task.action === "RUN_DIAGNOSTIC") {
        console.log("[HERMES] Executing local diagnostic protocol for target:", task.target);
        ws.send(JSON.stringify({ 
            status: "TASK_ACKNOWLEDGED", 
            target: task.target,
            execution_timestamp: new Date().toISOString(),
            diagnostic_metrics: {
                memory_usage_mb: process.memoryUsage().rss / (1024 * 1024),
                uptime_sec: process.uptime()
            }
        }));
    }
}
