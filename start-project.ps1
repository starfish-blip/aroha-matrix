# Master Project Launcher for Aroha Matrix
Set-Location $PSScriptRoot
Write-Host "Starting Aroha Matrix Environment..." -ForegroundColor Cyan

# 1. Run README generator
node scripts/generate-readme.cjs

# 2. Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
npm install ws

# 3. Start Hermes server / Phone Gateway backend
Write-Host "Starting Hermes server / Phone Gateway..." -ForegroundColor Green
Start-Process node -ArgumentList "hermes-server.js"

# 4. Timed delay for server stabilization (60 seconds)
Write-Host "Waiting for server stabilization (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# 5. Start static file server on port 5000
Write-Host "Starting static file server on port 5000..." -ForegroundColor Green
Start-Process npx -ArgumentList "serve . -p 5000"

Write-Host "Environment is ready. Phone gateway and services are live!" -ForegroundColor Cyan
