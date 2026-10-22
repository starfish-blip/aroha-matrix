from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="AROHA Engine v38 - Workstation with File Preset Menu")

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AROHA Engine v38 Master Workstation</title>
    <style>
        body { margin: 0; background: #020208; overflow: hidden; font-family: monospace; color: #0ff; }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1; }
        #ui-container {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%); width: 980px;
            background: rgba(5, 12, 25, 0.94); border: 1px solid #0ff;
            padding: 15px; box-sizing: border-box; z-index: 20; border-radius: 12px;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.35); backdrop-filter: blur(12px);
            user-select: none;
        }
        .drag-header { background: rgba(0, 255, 255, 0.15); padding: 6px 12px; border-radius: 6px; margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(0,255,255,0.3); }
        .top-bar, .page-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; justify-content: center; }
        button, select {
            background: #002b36; color: #839496; border: 1px solid #0ff;
            padding: 6px 12px; font-family: monospace; font-size: 0.8rem; cursor: pointer; border-radius: 4px;
        }
        button:hover, select:hover { background: #0ff; color: #000; font-weight: bold; }
        button.active { background: #0ff; color: #000; font-weight: bold; }
        .section-grid { display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; gap: 10px; margin-top: 10px; }
        .panel { background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,255,0.3); padding: 10px; border-radius: 6px; font-size: 0.75rem; }
        .fader-bank { display: flex; justify-content: space-between; gap: 3px; height: 110px; align-items: flex-end; padding-top: 10px; }
        .fader-col { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .fader-col input[type=range] { writing-mode: vertical-lr; direction: rtl; width: 18px; height: 75px; accent-color: #0ff; cursor: pointer; }
        .status-footer { font-size: 0.75rem; color: #0f0; border-top: 1px dashed #0ff; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; }
        #keyboard-tray { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); width: 980px; background: rgba(5,12,25,0.95); border: 1px solid #0ff; padding: 12px; border-radius: 8px; z-index: 20; text-align: center; box-shadow: 0 0 30px rgba(0,25
