const { WebSocketServer } = require('ws');
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
let sequenceId = 0;

console.log(`[HERMES] Telemetry Daemon initialized on port ${PORT}`);

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

wss.on('connection', (ws, req) => {
  console.log(`[HERMES] Client connected: ${req.socket.remoteAddress}`);
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) { ws.send(generateRawFrame()); }
  }, 16);
  ws.on('close', () => clearInterval(interval));
});