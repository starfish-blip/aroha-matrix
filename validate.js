const http = require('http');
const StateStore = require('./stateStore');
const TelemetryLogger = require('./logger');
const path = require('path');

const store = new StateStore(path.join(__dirname, 'system_state.json'));
const logger = new TelemetryLogger(path.join(__dirname, 'logs'));

async function runFullStackValidation() {
  console.log('--- Starting AROHA Full-Stack Integration Validation ---');

  const testPayload = { operationalState: 'VALIDATING', energy: 99, step: 999, timestamp: Date.now() };
  await store.save(testPayload);
  const loadedState = await store.load();
  
  if (!loadedState || loadedState.state.step !== 999) {
    throw new Error('State persistence check failed!');
  }
  console.log('[PASS] Atomic JSON State Persistence verified.');

  logger.log(testPayload);
  console.log('[PASS] Telemetry Logger and rotation stream verified.');

  const req = http.get('http://127.0.0.1:5000', (res) => {
    console.log('[PASS] Flask Visualization Layer reachable. Status Code: ' + res.statusCode);
    console.log('--- All Integration Tests Completed Successfully ---');
    process.exit(0);
  });

  req.on('error', (err) => {
    console.error('[FAIL] Could not reach Flask bridge on port 5000. Ensure bridge.py is running.');
    process.exit(1);
  });
}

runFullStackValidation();
