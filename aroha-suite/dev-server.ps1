param([int]$Port = 8085)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   AROHA Local Dev Server Active" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Laptop URL: http://localhost:$Port/" -ForegroundColor White
Write-Host " Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server $Port
} else {
    # Fallback to 127.0.0.1 HttpListener binding
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $localPath = Join-Path (Get-Location) ($req.Url.LocalPath.TrimStart('/') -replace '/','\')
        if ((Test-Path $localPath -PathType Container) -or $req.Url.LocalPath -eq '/') { $localPath = Join-Path $localPath "index.html" }
        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    }
}
