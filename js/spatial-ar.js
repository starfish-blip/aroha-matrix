window.ArohaSpatialAR = {
    activeStream: null,
    async initCamera(videoElement) {
        try {
            this.activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoElement.srcObject = this.activeStream;
            videoElement.play();
            console.log("[✓] Spatial AR Portal Camera Active");
        } catch (e) {
            console.warn("[!] Camera access denied or unavailable:", e);
        }
    },
    stopCamera() {
        if(this.activeStream) {
            this.activeStream.getTracks().forEach(track => track.stop());
            this.activeStream = null;
        }
    }
};
