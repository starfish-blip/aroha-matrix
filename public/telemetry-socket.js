class AROHATelemetryClient {
  constructor(path = '/api/ws') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}${path}`;
    this.socket = null;
    this.isConnected = false;
    this.reconnectInterval = 3000;
    this.listeners = new Set();
  }
  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => { this.isConnected = true; this.send({ type: 'INIT' }); };
    this.socket.onmessage = (event) => {
      try { this.notifyListeners(JSON.parse(event.data)); } catch (e) {}
    };
    this.socket.onclose = () => { this.isConnected = false; setTimeout(() => this.connect(), this.reconnectInterval); };
    this.socket.onerror = () => { this.socket.close(); };
  }
  send(payload) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
  onMessage(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  notifyListeners(data) {
    for (const cb of this.listeners) { cb(data); }
  }
}
export const telemetry = new AROHATelemetryClient();
telemetry.connect();
