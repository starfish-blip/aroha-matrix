from flask import Flask, render_template_string
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'aroha_telemetry_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Consciousness Dashboard</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.1/socket.io.min.js"></script>
    <style>
        body { background: #0f172a; color: #e2e8f0; font-family: monospace; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        h1 { color: #38bdf8; font-size: 1.5rem; }
        .metric { font-size: 1.2rem; color: #4ade80; }
        #logs { background: #090d16; padding: 10px; height: 200px; overflow-y: scroll; border: 1px solid #1e293b; }
    </style>
</head>
<body>
    <h1>AROHA Consciousness Pipeline</h1>
    <div class="card">
        <h3>Live Telemetry Status</h3>
        <p>State: <span id="state" class="metric">IDLE</span></p>
        <p>Energy: <span id="energy" class="metric">0</span></p>
        <p>Step Count: <span id="step" class="metric">0</span></p>
    </div>
    <div class="card">
        <h3>Event Stream Log</h3>
        <div id="logs">Waiting for telemetry pulses...</div>
    </div>
    <script>
        const socket = io('http://127.0.0.1:5000');
        socket.on('render_update', (data) => {
            document.getElementById('state').innerText = data.operationalState;
            document.getElementById('energy').innerText = data.energy;
            document.getElementById('step').innerText = data.step;
            
            const logs = document.getElementById('logs');
            const entry = document.createElement('div');
            entry.innerText = [] Pulse Received - Energy: , Step: ;
            logs.appendChild(entry);
            logs.scrollTop = logs.scrollHeight;
        });
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(DASHBOARD_HTML)

@socketio.on('telemetry_pulse')
def handle_telemetry(data):
    print(f"Received Telemetry Pulse: {data}")
    emit('render_update', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5000)
