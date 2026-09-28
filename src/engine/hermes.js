import { WebSocketServer } from "ws";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const wss = new WebSocketServer({ port: 8080 });
let tasks = [
    { id: 1, text: "Initialize Aroha Matrix" },
    { id: 2, text: "Connect TaskFlow to Hermes" },
    { id: 3, text: "Enable Self-Updating Engine" }
];

wss.on("connection", (ws) => {
    console.log("Client connected to Hermes Engine.");
    ws.send(JSON.stringify({ type: "INIT_TASKS", tasks }));

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === "ADD_TASK") {
                const newTask = { id: Date.now(), text: data.text };
                tasks.push(newTask);
                broadcast({ type: "UPDATE_TASKS", tasks });
            } else if (data.type === "EXEC_UPDATE") {
                exec("git pull origin main", { cwd: "C:\\Users\\terry\\aroha-matrix" }, (error, stdout, stderr) => {
                    const resultText = error ? (stderr || error.message) : (stdout || "Already up to date.");
                    ws.send(JSON.stringify({ type: "PIPELINE_COMPLETE", log: resultText }));
                });
            } else if (data.type === "FETCH_TELEMETRY") {
                const telemetryPath = path.join("C:\\Users\\terry\\aroha-matrix", "dsr_telemetry.json");
                if (fs.existsSync(telemetryPath)) {
                    const telData = JSON.parse(fs.readFileSync(telemetryPath, "utf8"));
                    ws.send(JSON.stringify({ type: "TELEMETRY_DATA", telemetry: telData }));
                } else {
                    ws.send(JSON.stringify({ type: "TELEMETRY_DATA", telemetry: { status: "No telemetry file found. Run audit/telemetry script." } }));
                }
            }
        } catch (err) {
            console.error("Error handling message:", err);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected.");
    });
});

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

console.log("Hermes WebSocket engine running on ws://localhost:8080");

