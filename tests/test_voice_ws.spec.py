import asyncio
import websockets
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("WS-TestClient")

async def run_test():
    uri = "ws://127.0.0.1:8002/ws/voice"
    logger.info(f"Connecting to Voice WebSocket server at {uri}...")
    
    async with websockets.connect(uri) as websocket:
        logger.info("Connected successfully. Sending mock transcript...")
        
        # Send mock transcript to trigger Ollama / TTS simulation
        test_prompt = "What is the current synodic Maramataka phase?"
        await websocket.send(json.dumps({
            "type": "transcript",
            "text": test_prompt
        }))
        
        tts_started = False
        received_response_text = None
        interrupted_ack = False
        
        while True:
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=8.0)
                data = json.loads(response)
                logger.info(f"[Received from Server]: {data}")
                
                msg_type = data.get("type")
                
                if msg_type == "tts_start":
                    tts_started = True
                    received_response_text = data.get("response")
                    prompt_echo = data.get("prompt")
                    
                    logger.info(f"TTS Started! Prompt echoed: '{prompt_echo}' | LLM Response: '{received_response_text}'")
                    
                    # Assert prompt matches what we sent
                    assert prompt_echo == test_prompt, f"Expected prompt echo '{test_prompt}', got '{prompt_echo}'"
                    assert received_response_text and len(received_response_text) > 0, "LLM response payload is empty."
                    
                    logger.info("Triggering user barge-in interrupt...")
                    await websocket.send(json.dumps({"type": "barge_in"}))
                    
                elif msg_type == "interrupted":
                    interrupted_ack = (data.get("status") == "halted")
                    logger.info("Barge-in successfully acknowledged by server!")
                    break
                    
            except asyncio.TimeoutError:
                logger.error("Timeout waiting for server response.")
                break
                
        # Final test assertions
        assert tts_started, "Test failed: tts_start was never received."
        assert received_response_text is not None, "Test failed: LLM response payload was missing."
        assert interrupted_ack, "Test failed: Server did not return interrupted acknowledgment."
        
        logger.info("WebSocket Full Payload & Barge-In Integration Test PASSED Successfully!")

if __name__ == "__main__":
    asyncio.run(run_test())
