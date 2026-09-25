const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
    console.log("Connected to Hermes! Sending SORT_DIRECTORY task...");
    ws.send(JSON.stringify({ action: "SORT_DIRECTORY", path: "C:\\Users\\terry\\hermes-server" }));
});

ws.on("message", (msg) => {
    console.log("Msg:", msg.toString());
});

ws.on("error", (e) => {
    console.error("Err:", e.message);
});

ws.on("close", (c, r) => {
    console.log("Closed:", c, r ? r.toString() : "");
});
