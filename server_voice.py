import asyncio
import json
import logging
import io
import wave
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import ollama

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AROHA-VoiceServer")

app = FastAPI(title="AROHA Voice & Telemetry Streaming Server")

active_connections = set()

class AudioStreamSession:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.audio_buffer = bytearray()
        self.current_task = None
        self.is_generating = False

    def add_pcm_chunk(self, data: bytes):
        self.audio_buffer.extend(data)
        # Fixed: Corrected len() parenthesis for buffer bounding
        if len(self.audio_buffer) > 320000:
            self.audio_buffer = self.audio_buffer[-320000:]

    def clear_buffer(self):
        self.audio_buffer.clear()

@app.get("/health")
async def health_check():
    return {"status": "online", "service": "aroha-voice-server", "sample_rate": 16000}

@app.websocket("/ws/voice")
async def voice_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    session = AudioStreamSession(websocket)
    logger.info(f"Client connected: {websocket.client}")

    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                pcm_chunk = message["bytes"]
                session.add_pcm_chunk(pcm_chunk)
                if len(session.audio_buffer) >= 32000:
                    logger.debug(f"Buffered {len(session.audio_buffer)} bytes of 16kHz PCM audio.")
                    
            elif "text" in message:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")
                    logger.info(f"Received control message: {msg_type}")

                    if msg_type == "transcript":
                        prompt_text = data.get("text")
                        session.current_task = asyncio.create_task(
                            process_llm_and_tts(session, prompt_text)
                        )

                    elif msg_type == "barge_in":
                        logger.info("Barge-in interrupt received from client.")
                        if session.current_task and not session.current_task.done():
                            session.current_task.cancel()
                        session.is_generating = False
                        session.clear_buffer()
                        await websocket.send_json({
                            "type": "interrupted",
                            "status": "halted"
                        })

                    elif msg_type == "client_ready":
                        logger.info(f"Client ready handshake received: {data.get('device')}")
                        await websocket.send_json({
                            "type": "server_ack",
                            "status": "ready"
                        })

                except json.JSONDecodeError:
                    logger.error("Failed to parse incoming JSON text frame.")

    except WebSocketDisconnect:
        logger.info("Client disconnected from voice WebSocket.")
    except Exception as e:
        logger.error(f"Error in voice WebSocket session: {e}")
    finally:
        active_connections.remove(websocket)
        if session.current_task and not session.current_task.done():
            session.current_task.cancel()

async def process_llm_and_tts(session: AudioStreamSession, prompt: str):
    try:
        session.is_generating = True
        logger.info(f"Routing prompt to Ollama: '{prompt}'")
        
        response = await asyncio.to_thread(
            ollama.chat,
            model="qwen2.5:3b",
            messages=[
                {"role": "system", "content": "You are the AROHA spatial acoustic intelligence core. Be concise and direct."},
                {"role": "user", "content": prompt}
            ]
        )
        
        llm_reply = response["message"]["content"]
        logger.info(f"Ollama response generated: '{llm_reply}'")
        
        if not session.is_generating:
            return

        await session.websocket.send_json({
            "type": "tts_start",
            "prompt": prompt,
            "response": llm_reply
        })
        
        await asyncio.sleep(1.0) 
        
    except asyncio.CancelledError:
        logger.info("LLM/TTS processing task was successfully cancelled by barge-in.")
    except Exception as e:
        logger.error(f"Error during LLM/TTS processing: {e}")
    finally:
        session.is_generating = False
