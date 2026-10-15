Set-Content -Path "app.py" -Value @"
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

@app.websocket("/ws/acoustic/stream")
async def acoustic_stream(websocket: WebSocket):
    await websocket.accept()
    print("[SERVER] Binary DSP client connected!")
    sample_rate = 44100
    try:
        while True:
            # Must be receive_bytes() to match binary client chunks!
            data = await websocket.receive_bytes()
            if not data:
                continue
            
            audio_data = np.frombuffer(data, dtype=np.int16)
            if len(audio_data) > 0:
                rms = float(np.sqrt(np.mean(audio_data.astype(np.float32) ** 2)))
                peak_amplitude = int(np.max(np.abs(audio_data)))
                
                fft_spectrum = np.fft.rfft(audio_data.astype(np.float32))
                fft_frequencies = np.fft.rfftfreq(len(audio_data), 1 / sample_rate)
                magnitude_spectrum = np.abs(fft_spectrum)
                
                peak_freq_idx = np.argmax(magnitude_spectrum)
                dominant_frequency = float(fft_frequencies[peak_freq_idx])
                
                report = {
                    "samples_processed": len(audio_data),
                    "rms_level": round(rms, 2),
                    "peak_amplitude": peak_amplitude,
                    "dominant_frequency_hz": round(dominant_frequency, 2)
                }
                
                await websocket.send_json(report)
                
    except WebSocketDisconnect:
        print("[SERVER] Client disconnected.")
    except Exception as e:
        print(f"[SERVER ERROR]: {e}")
"@
