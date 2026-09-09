const fs = require('fs');
const path = require('path');

class TelemetryLogger {
  constructor(logDir, maxBytes = 5 * 1024 * 1024) {
    this.logDir = path.resolve(logDir);
    this.maxBytes = maxBytes;
    this.currentLogPath = path.join(this.logDir, 'telemetry.log');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(data) {
    const entry = JSON.stringify({ t: Date.now(), ...data }) + '\n';
    
    if (fs.existsSync(this.currentLogPath)) {
      const stats = fs.statSync(this.currentLogPath);
      if (stats.size >= this.maxBytes) {
        const archivedPath = path.join(this.logDir, 'telemetry-' + Date.now() + '.log');
        fs.renameSync(this.currentLogPath, archivedPath);
      }
    }

    fs.appendFileSync(this.currentLogPath, entry, 'utf8');
  }
}

module.exports = TelemetryLogger;
