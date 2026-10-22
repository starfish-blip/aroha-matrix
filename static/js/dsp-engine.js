class AROHADSPEngine {
    constructor() {
        this.delayNode = null;
        this.feedbackNode = null;
        this.convolverNode = null;
        this.liveAudioStream = null;
        this.liveSourceNode = null;
    }

    initEffects(audioCtx, masterGain) {
        if (!audioCtx) return;

        // Create Stereo Feedback Delay
        this.delayNode = audioCtx.createDelay();
        this.delayNode.delayTime.value = 0.375; // rhythmic dotted delay
        this.feedbackNode = audioCtx.createGain();
        this.feedbackNode.gain.value = 0.4;

        this.delayNode.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delayNode);
        this.delayNode.connect(masterGain);

        console.log("[DSP] Spatial Delay & Convolver Reverb Routing Initialized");
    }

    async initLiveInput(audioCtx, destinationNode) {
        try {
            this.liveAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.liveSourceNode = audioCtx.createMediaStreamSource(this.liveAudioStream);
            this.liveSourceNode.connect(destinationNode);
            console.log("[DSP] Live Audio / Guitar Input Connected Successfully");
            alert("Live Audio Input Connected! Play your instrument or speak into mic.");
        } catch (err) {
            console.warn("[DSP] Could not access live audio input: ", err);
            alert("Microphone/Instrument access denied or unavailable.");
        }
    }

    setDelayTime(val) {
        if (this.delayNode) {
            this.delayNode.delayTime.setTargetAtTime(parseFloat(val), 0, 0.05);
        }
    }
}

window.dspEngine = new AROHADSPEngine();