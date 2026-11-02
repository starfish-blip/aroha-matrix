/**
 * AROHA WebRTC Session Sync Plugin (roha-webrtc-sync.js)
 * Real-time peer-to-peer mesh synchronization for fader banks, active Solfeggio frequencies,
 * and Chladni standing wave parameters across local network or Tailscale nodes.
 */

export class ArohaWebRTCSync {
    constructor(matrixState, signalingUrl = 'ws://localhost:8000/ws/mesh') {
        this.matrixState = matrixState;
        this.signalingUrl = signalingUrl;
        this.ws = null;
        this.peers = {};
        this.isHost = false;
    }

    connect() {
        console.log('[WebRTC Mesh] Connecting to signaling broker:', this.signalingUrl);
        try {
            this.ws = new WebSocket(this.signalingUrl);
            this.ws.onopen = () => console.log('[WebRTC Mesh] Connected to mesh network.');
            this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
            this.ws.onerror = (err) => console.warn('[WebRTC Mesh] Connection error (offline fallback active):', err);
        } catch (e) {
            console.warn('[WebRTC Mesh] Signaling server offline. Running in local standalone mode.');
        }
    }

    broadcastState(stateUpdate) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'STATE_SYNC', payload: stateUpdate }));
        }
    }

    handleMessage(msg) {
        if (msg.type === 'STATE_SYNC') {
            console.log('[WebRTC Mesh] Received remote state adjustment:', msg.payload);
            if (typeof this.matrixState.applyRemoteState === 'function') {
                this.matrixState.applyRemoteState(msg.payload);
            }
        }
    }
}

export default ArohaWebRTCSync;
