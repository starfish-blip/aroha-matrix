param(
    [string]$CommitMessage = "feat(aroha): automated release sync via deployment agent"
)

Write-Host "[AROHA Agent] Starting pre-deployment audit..." -ForegroundColor Cyan

if (!(Test-Path ".nojekyll")) {
    New-Item .nojekyll -Force | Out-Null
    Write-Host "[AROHA Agent] Created .nojekyll bypass." -ForegroundColor Green
}

if (Test-Path "node_modules") {
    Write-Host "[AROHA Agent] Excluding node_modules..." -ForegroundColor Yellow
    git rm -r --cached node_modules 2>$null
}

Write-Host "[AROHA Agent] Staging clean release artifacts..." -ForegroundColor Cyan
git add .nojekyll index.html aroha-suite/ public/ assets/ .github/

$stagedFiles = git status --porcelain
if ($null -eq $stagedFiles) {
    Write-Host "[AROHA Agent] No valid production changes detected." -ForegroundColor Yellow
    exit
}

Write-Host "[AROHA Agent] Committing release payload..." -ForegroundColor Cyan
git commit -m $CommitMessage

Write-Host "[AROHA Agent] Pushing to remote origin (main)..." -ForegroundColor Cyan
git push origin main

Write-Host "[AROHA Agent] Verifying live deployment at starmaps13.com..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "https://starmaps13.com" -Method Head -UseBasicParsing
Write-Host "[AROHA Agent] Deployment complete! Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green