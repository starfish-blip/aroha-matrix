from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="AROHA Direct MIDI Instrument")

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Direct MIDI Instrument</title>
    <style>
        body {
            background: #05050a;
            color: #0ff;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        #display-box {
            width: 420px;
            height: 420px;
            border-radius: 50%;
            border: 2px solid #0ff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: background 0.1s ease, box-shadow 0.1s ease;
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }
        h1 { font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 5px; color: #fff; }
        p { font-size: 0.8rem; color: #839496; margin-top: 0; }
        .status { margin-top: 20px; font-size: 0.75rem; color: #0f0; }
    </style>
</head>
<body>
    <h1>AROHA Direct MIDI Engine</h1>
    <p>Play keys on your M-Audio Oxygen 61 for direct frequency & color response.</p>
    
    <div id="display-box">
        <div id="note-display">Awaiting MIDI Input...</div>
    </div>
    
    <div class="status" id="midi-status">Initializing MIDI...</div>

    <script>
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
        } else {
            document.getElementById('midi-status').innerText = "Web MIDI API not supported in this browser.";
        }

        function onMIDISuccess(midiAccess) {
            document.getElementById('midi-status').innerText = "MIDI Connected: Oxygen 61 Ready.";
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = getMIDIMessage;
            }
        }

        function onMIDIFailure() {
            document.getElementById('midi-status').innerText = "Could not access MIDI devices.";
        }

        function getMIDIMessage(message) {
            initAudio();
            let [command, note, velocity] = message.data;
            velocity = velocity || 0;

            // Note On message (144 to 159) with velocity > 0
            if (command >= 144 && command <= 159 && velocity > 0) {
                let freq = 440 * Math.pow(2, (note - 69) / 12);
                playNoteTone(freq, velocity);
                updateVisuals(note, velocity, freq);
            }
        }

        function playNoteTone(freq, velocity) {
            if (!audioCtx) return;

            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            let gainValue = (velocity / 127) * 0.15;
            gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 1.2);
        }

        function updateVisuals(note, velocity, freq) {
            let box = document.getElementById('display-box');
            let display = document.getElementById('note-display');

            // Map note position to color hue (0 to 360)
            let hue = Math.floor((note / 127) * 360);
            let lightness = Math.floor((velocity / 127) * 45) + 15;

            box.style.backgroundColor = `hsl(${hue}, 85%, ${lightness}%)`;
            box.style.boxShadow = `0 0 ${velocity}px hsl(${hue}, 100%, 50%)`;
            
            display.innerHTML = `<strong>Note:</strong> ${note}<br><strong>Freq:</strong> ${freq.toFixed(1)} Hz<br><strong>Velocity:</strong> ${velocity}`;
        }
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return HTML_CONTENT

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aroha_engine:app", host="127.0.0.1", port=8000, reload=False)
