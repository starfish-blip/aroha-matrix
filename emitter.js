const { io } = require('socket.io-client');
const StateStore = require('./stateStore');
const path = require('path');

const socket = io('http://127.0.0.1:5000');
const store = new StateStore(path.join(__dirname, 'system_state.json'));

socket.on('connect', () => {
  console.log('Connected to Flask Visualization Bridge on port 5000');
  
  // Simulate live telemetry pulse loop every 2 seconds
  let step = 0;
  setInterval(async () => {
    step++;
    const payload = {
      operationalState: 'ACTIVE',
      energy: Math.floor(Math.random() * 50) + 50,
      step: step,
      timestamp: Date.now()
    };

    // Save locally via atomic store
    await store.save(payload);

    // Emit to Python bridge
    socket.emit('telemetry_pulse', payload);
    console.log('Dispatched telemetry pulse:', payload);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('Disconnected from Flask bridge.');
});
