
/**
 * hermes-client.js
 * Robust Client Adapter for Live Telemetry Stream
 */

class HermesClient {
  constructor(serverUrl = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = 3000;
    this.maxReconnectAttempts = 5;
    this.reconnectAttempts = 0;
  }

  connect(onMessageCallback) {
    // Prevent connecting via ws:// if page is on https://
    if (window.location.protocol === 'https:' && this.serverUrl.startsWith('ws://')) {
      console.warn('[HERMES CLIENT] Plain ws:// blocked on https://. Use wss:// or run site locally via http://');
      return;
    }

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[HERMES CLIENT] Connected to local telemetry daemon');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (onMessageCallback) onMessageCallback(payload);
        } catch (err) {
          console.error('[HERMES CLIENT] Invalid JSON frame received:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[HERMES CLIENT] Connection closed');
        this.handleReconnect(onMessageCallback);
      };

      this.ws.onerror = (err) => {
        console.error('[HERMES CLIENT] Socket error:', err);
        this.ws.close();
      };
    } catch (e) {
      console.error('[HERMES CLIENT] Connection failed:', e);
      this.handleReconnect(onMessageCallback);
    }
  }

  handleReconnect(onMessageCallback) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[HERMES CLIENT] Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      setTimeout(() => this.connect(onMessageCallback), this.reconnectInterval);
    } else {
      console.warn('[HERMES CLIENT] Max reconnect attempts reached. Operating in local simulation mode.');
    }
  }
}

window.hermesClient = new HermesClient();
