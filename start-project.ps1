# Master Project Launcher for Aroha Matrix
Set-Location $PSScriptRoot
Write-Host "Starting Aroha Matrix Environment..." -ForegroundColor Cyan

# Run the README generator or other init tasks
node scripts/generate-readme.cjs

# Launch main index or server depending on configuration
Write-Host "Environment is ready. Launching local services..." -ForegroundColor Green
