Write-Host "Dang tai xuong Cloudflare Tunnel (cloudflared)..."
$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$output = "cloudflared.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Tai xuong thanh cong!" -ForegroundColor Green
} catch {
    Write-Host "Loi khi tai xuong: $_" -ForegroundColor Red
    exit 1
}
