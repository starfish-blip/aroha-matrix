# Verify-ArohaStack.ps1
# Saves PM2 state, checks Tailscale FastAPI health, runs T3-06/T4-01/T5-01 with trace capture on failure, and opens the HTML report.
$ErrorActionPreference = "Stop"
$RepoPath = "C:\Users\terry\aroha-matrix"
$TailscaleUrl = "http://100.64.150.117:8000"
$TestSuites = @("T3-06", "T4-01", "T5-01")

Set-Location -Path $RepoPath

Write-Host "`n[1/4] Saving PM2 process state..." -ForegroundColor Cyan
pm2 status
pm2 save --force

Write-Host "`n[2/4] Checking FastAPI health over Tailscale ($TailscaleUrl/health)..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$TailscaleUrl/health" -Method Get -TimeoutSec 5
    Write-Host "Health OK: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Warning "Tailscale /health check failed ($($_.Exception.Message)). Proceeding to Playwright tests..."
}

Write-Host "`n[3/4] Running Playwright suites ($($TestSuites -join ', ')) with trace capture..." -ForegroundColor Cyan
npx playwright test @TestSuites --workers=1 --retries=1 --trace=retain-on-failure --reporter=list,html
$testExitCode = $LASTEXITCODE

Write-Host "`n[4/4] Opening Playwright HTML report..." -ForegroundColor Cyan
if ($testExitCode -eq 0) {
    Write-Host "PASS: PM2 state saved and all suites passed." -ForegroundColor Green
} else {
    Write-Warning "One or more Playwright tests failed (exit code $testExitCode). Open the trace viewer inside the HTML report to inspect UBO frames."
}

npx playwright show-report
