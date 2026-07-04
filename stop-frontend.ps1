param([int]$Port = 9528)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "No frontend process is listening on port $Port."
  exit 0
}

$connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
  Stop-Process -Id $_ -Force
  Write-Host "Stopped frontend process $_ on port $Port."
}
