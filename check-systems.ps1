# Aroha Matrix Systems Diagnostic Check
Write-Host "Running Aroha Matrix Systems Diagnostic..." -ForegroundColor Cyan

# 1. Check Node.js version
try {
    $nodeVer = node -v
    Write-Host "[OK] Node.js is installed: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Node.js is not found in PATH." -ForegroundColor Red
}

# 2. Check port 5000 (Static File Server)
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "[OK] Static File Server is listening on port 5000." -ForegroundColor Green
} else {
    Write-Host "[WARN] Port 5000 is not active (File server may be down)." -ForegroundColor Yellow
}

# 3. Check port 8080 (Hermes / Phone Gateway)
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($port8080) {
    Write-Host "[OK] Hermes Server / Phone Gateway is listening on port 8080." -ForegroundColor Green
} else {
    Write-Host "[WARN] Port 8080 is not active (Hermes server may be down)." -ForegroundColor Yellow
}

Write-Host "Diagnostics complete." -ForegroundColor Cyan
