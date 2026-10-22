code = """from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

app = FastAPI(title='AROHA Harmonic Instrument')

HTML_CONTENT = \"\"\"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <title>AROHA Engine - Atlas UI</title>
    <style>
        body { margin: 0; background: #050505; color: #fff; font-family: sans-serif; overflow: hidden; }
        #canvas-container { width: 100vw; height: 100vh; }
        .hud { position: absolute; top: 20px; left: 20px; pointer-events: none; }
    </style>
</head>
<body>
    <div class='hud'>
        <h1>AROHA Harmonic Instrument</h1>
        <p>Status: <span id='status'>Connecting...</span></p>
    </div>
    <div id='canvas-container'></div>
    <script>
        const ws = new WebSocket('ws://' + window.location.host + '/ws/aroha');
        ws.onopen = () => {
            console.log('AROHA Engine connected.');
            document.getElementById('status').innerText = 'Online & Synchronized';
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('State updated:', data);
        };
    </script>
</body>
</html>\"\"\"

@app.get('/', response_class=HTMLResponse)
async def read_index():
    return HTML_CONTENT

@app.websocket('/ws/aroha')
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text('{"status": "synchronized"}')
    except WebSocketDisconnect:
        pass
"""

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("main.py generated successfully!")
