param([string]$Branch = "main")
Write-Host "[AROHA] Checking git status..." -ForegroundColor Cyan
git status
Write-Host "[AROHA] Pulling latest updates from origin/$Branch..." -ForegroundColor Cyan
git pull origin $Branch
if ($?) {
    Write-Host "[AROHA] Refreshing local PM2 processes..." -ForegroundColor Cyan
    pm2 restart all
    pm2 status
    Write-Host "[AROHA] Matrix sync complete." -ForegroundColor Green
} else {
    Write-Host "[AROHA] Git pull encountered conflicts." -ForegroundColor Red
}
