class ArohaSpatialARPortal {
  constructor(config = {}) {
    this.videoElement = null;
    this.canvasElement = null;
    this.tikiTiltAngle = 36.87 * (Math.PI / 180);
    this.init();
  }
  async init() {
    this.setupDOM();
    await this.startCameraStream();
    this.bindOrientationEvents();
  }
  setupDOM() {
    const container = document.getElementById('tab3-portal-root') || document.body;
    container.innerHTML = `
      <div class="ar-portal-container" style="position:relative; width:100%; height:100vh; overflow:hidden; background:#000;">
        <video id="ar-camera-feed" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
        <canvas id="ar-overlay-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></canvas>
        <div id="ar-telemetry-hud" style="position:absolute; bottom:20px; left:20px; color:#00ffff; font-family:monospace; background:rgba(0,0,0,0.7); padding:10px; border:1px solid #00ffff; border-radius:4px;">
          <div>LAT: <span id="hud-lat">-41.2264</span> | LNG: <span id="hud-lng">174.9018</span></div>
          <div>TIKI TILT: 36.87° | AZIMUTH: <span id="hud-azimuth">0°</span></div>
          <div>ZONE: 1 (Cosmic Dome - Point 25)</div>
        </div>
      </div>
    `;
    this.videoElement = document.getElementById('ar-camera-feed');
    this.canvasElement = document.getElementById('ar-overlay-canvas');
  }
  async startCameraStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
      this.videoElement.srcObject = stream;
    } catch (err) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.videoElement.srcObject = fallbackStream;
      } catch (e) { console.error("Camera access unavailable:", e); }
    }
  }
  bindOrientationEvents() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (event) => {
        const alpha = event.alpha || 0;
        const beta = event.beta || 0;
        const gamma = event.gamma || 0;
        const correctedPitch = beta * Math.cos(this.tikiTiltAngle) - gamma * Math.sin(this.tikiTiltAngle);
        const hudAzimuth = document.getElementById('hud-azimuth');
        if (hudAzimuth) { hudAzimuth.textContent = `${Math.round(alpha)}° (Pitch: ${Math.round(correctedPitch)}°)`; }
      });
    }
  }
}
window.ArohaSpatialARPortal = ArohaSpatialARPortal;
