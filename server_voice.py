import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import ollama

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AROHA-VoiceLoop")

app = FastAPI(title="AROHA Voice & Data Tailscale Streaming Loop")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aroha-voice-streaming", "tailscale_ip": "100.104.121.111"}

@app.websocket("/ws/voice")
async def voice_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("[Tailscale WS] S24 Ultra voice client connected.")
    
    # Active task reference for ongoing TTS/LLM generation so we can cancel on barge-in
    current_generation_task = None

    async def simulate_tts_playback(prompt, reply_text):
        try:
            # Broadcast TTS Start
            await websocket.send_text(json.dumps({
                "type": "tts_start",
                "prompt": prompt,
                "response": reply_text
            }))
            logger.info(f"[TTS Stream Started] Speaking reply: '{reply_text[:40]}...'")
            
            # Simulate speech duration (e.g. 5 to 8 seconds depending on length)
            speech_duration = min(10.0, max(3.0, len(reply_text) * 0.08))
            await asyncio.sleep(speech_duration)
            
            # Broadcast TTS End
            await websocket.send_text(json.dumps({
                "type": "tts_end"
            }))
            logger.info("[TTS Stream Completed]")
        except asyncio.CancelledError:
            logger.info("[TTS Stream Cancelled] Interrupted by client barge-in.")
            raise

    try:
        while True:
            message = await websocket.receive()
            
            if "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type", "chat")
                
                if msg_type == "transcript":
                    user_text = data.get("text", "Hello AROHA")
                    logger.info(f"[Whisper STT Received]: {user_text}")
                    
                    # Route prompt to local Ollama model (Qwen 2.5)
                    response = ollama.chat(model='qwen2.5-coder:latest', messages=[
                        {'role': 'system', 'content': 'You are AROHA, an autonomous acoustic intelligence assistant running locally on Terry Stohr workstation.'},
                        {'role': 'user', 'content': user_text},
                    ])
                    reply_text = response['message']['content']
                    logger.info(f"[Ollama Response]: {reply_text}")
                    
                    # Start async TTS generation / playback simulation task
                    if current_generation_task and not current_generation_task.done():
                        current_generation_task.cancel()
                    current_generation_task = asyncio.create_task(simulate_tts_playback(user_text, reply_text))

                elif msg_type == "barge_in":
                    logger.info("[Barge-In Interrupt Received] Halting current LLM/TTS generation.")
                    if current_generation_task and not current_generation_task.done():
                        current_generation_task.cancel()
                    await websocket.send_text(json.dumps({"type": "interrupted", "status": "halted"}))
                    
            elif "bytes" in message:
                audio_bytes = message["bytes"]
                logger.debug(f"[Audio Stream]: Received {len(audio_bytes)} raw PCM bytes.")
                
    except WebSocketDisconnect:
        logger.info("[Tailscale WS] S24 Ultra disconnected.")
    except Exception as e:
        logger.error(f"[Tailscale WS Error]: {e}")
    finally:
        if current_generation_task and not current_generation_task.done():
            current_generation_task.cancel()
