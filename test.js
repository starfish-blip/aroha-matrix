const StateStore = require('./stateStore');
const path = require('path');
const storePath = path.join(__dirname, 'system_state.json');
const manager = new StateStore(storePath);

(async () => {
  await manager.save({ operationalState: 'IDLE', energy: 100, step: 0 });
  const restored = await manager.load();
  console.log('Verification Complete. Loaded State:', restored);
})();
