class AROHARecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    startRecording(audioContext, destinationNode, canvasElement) {
        if (this.isRecording) return;
        
        const audioDest = audioContext.createMediaStreamDestination();
        destinationNode.connect(audioDest);

        const audioTrack = audioDest.stream.getAudioTracks()[0];
        const canvasStream = canvasElement.captureStream(30); // 30 FPS visual stream
        const videoTrack = canvasStream.getVideoTracks()[0];

        const combinedStream = new MediaStream([audioTrack, videoTrack]);

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `AROHA-AV-Performance-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            console.log("[Recorder] A/V Performance Exported Successfully");
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        console.log("[Recorder] A/V Recording Started...");
    }

    stopRecording() {
        if (!this.isRecording) return;
        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log("[Recorder] A/V Recording Stopped.");
    }
}

window.arohaRecorder = new AROHARecorder();