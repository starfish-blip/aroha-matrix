# executor.py
import asyncio
import yaml
import websockets
import json
import os

YAML_PATH = 'aroha_state.yaml'

async def watch_state(websocket, path):
    last_mtime = 0
    print(f"Client connected. Watching {YAML_PATH} for shifts...")
    
    while True:
        try:
            mtime = os.path.getmtime(YAML_PATH)
            if mtime != last_mtime:
                with open(YAML_PATH, 'r') as file:
                    state_data = yaml.safe_load(file)
                
                # Push the active state dictionary as JSON
                if 'state' in state_data:
                    await websocket.send(json.dumps(state_data['state']))
                    print(f"Shift deployed: h={state_data['state'].get('h')}")
                
                last_mtime = mtime
        except Exception as e:
            print(f"Read error or incomplete YAML write: {e}")
            
        await asyncio.sleep(0.1) # 100ms polling for near-instant reactivity

start_server = websockets.serve(watch_state, "localhost", 8765)

if __name__ == "__main__":
    print("AROHA Executor online. Broadcasting on ws://localhost:8765")
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()