const fs = require('fs').promises;
const path = require('path');

class StateStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.tempPath = this.filePath + '.tmp';
  }

  async save(stateData) {
    const serialized = JSON.stringify({
      timestamp: Date.now(),
      state: stateData
    }, null, 2);

    try {
      await fs.writeFile(this.tempPath, serialized, 'utf8');
      await fs.rename(this.tempPath, this.filePath);
    } catch (error) {
      console.error('State persistence failure:', error.message);
      throw error;
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

module.exports = StateStore;
