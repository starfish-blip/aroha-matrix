Write-Host "[AROHA v34] Starting Master System..." -ForegroundColor Cyan

# Start Telemetry Agent Daemon on Port 5000 in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python aroha_agent.py"

# Start Main FastAPI Controller & Visualizer Server on Port 3000 in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python main.py"

Start-Sleep -Seconds 2

# Open Default Browser to Controller Dashboard
Start-Process "http://localhost:3000"

Write-Host "[SUCCESS] AROHA v34 matrix online. Agent on :5000, Controller on :3000." -ForegroundColor Green