$domeDir = "$HOME\aroha-matrix\aroha-dome-6x6"
$v34Dir  = "$HOME\aroha-matrix\aroha-engine-v34"

Get-NetTCPConnection -LocalPort 8080, 3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-WindowStyle Minimized", "-Command", "cd '$domeDir'; python -m uvicorn server_ws:app --host 0.0.0.0 --port 8080"
Start-Process powershell -ArgumentList "-WindowStyle Minimized", "-Command", "cd '$v34Dir'; python -m uvicorn aroha_engine_v34:app --host 0.0.0.0 --port 3000"
Start-Sleep -Seconds 2

Start-Process "http://localhost:8000/"
Start-Process "http://localhost:8080/"
Start-Process "http://localhost:3000/"
Write-Host "[AROHA NEXUS] Ports 8000, 8080, and 3000 launched!" -ForegroundColor Green