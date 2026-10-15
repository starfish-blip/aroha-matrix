Set-Content -Path "client.py" -Value @"
import asyncio
import json
import math
import struct
import websockets

async def stream_binary_pcm_with_telemetry():
    uri = "ws://localhost:8000/ws/acoustic/stream"
    print(f"Connecting to DSP acoustic stream at {uri}...")
    
    sample_rate = 44100
    chunk_duration = 0.5
    chunk_size = int(sample_rate * chunk_duration)
    frequency = 440.0
    
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                print("Connected! Streaming PCM chunks and listening for DSP feedback...")
                sample_index = 0
                
                while True:
                    pcm_chunks = bytearray()
                    for i in range(chunk_size):
                        t = (sample_index + i) / sample_rate
                        sample = int(32767.0 * math.sin(2.0 * math.pi * frequency * t))
                        pcm_chunks.extend(struct.pack('<h', sample))
                    
                    sample_index += chunk_size
                    
                    await websocket.send(pcm_chunks)
                    response_raw = await websocket.recv()
                    telemetry = json.loads(response_raw)
                    
                    print(
                        f"📊 [DSP Telemetry] "
                        f"Samples: {telemetry['samples_processed']} | "
                        f"RMS: {telemetry['rms_level']} | "
                        f"Peak Amp: {telemetry['peak_amplitude']} | "
                        f"Dominant Freq: {telemetry['dominant_frequency_hz']} Hz"
                    )
                    
                    await asyncio.sleep(chunk_duration)
                    
        except (websockets.ConnectionClosedError, ConnectionRefusedError):
            print("Connection lost. Reconnecting in 3 seconds...")
            await asyncio.sleep(3.0)

if __name__ == "__main__":
    try:
        asyncio.run(stream_binary_pcm_with_telemetry())
    except KeyboardInterrupt:
        print("\nClient stopped by user.")
"@
