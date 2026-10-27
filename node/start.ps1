# Starts a Rastro community node on Windows with Docker Desktop.
#   powershell -ExecutionPolicy Bypass -File .\start.ps1           relay + photos + Tor onion address
#   powershell -ExecutionPolicy Bypass -File .\start.ps1 -Tunnel   also a public HTTPS address (needs TUNNEL_TOKEN in .env)
param([switch]$Tunnel)
# Native commands report through exit codes; Windows PowerShell 5 would otherwise stop on docker's stderr.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker Desktop is required: https://docs.docker.com/desktop/setup/install/windows-install/'
  exit 1
}
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Docker is installed but not running. Open Docker Desktop and try again.'
  exit 1
}

if ($Tunnel) {
  if (Test-Path .env) {
    Get-Content .env | ForEach-Object { if ($_ -match '^\s*TUNNEL_TOKEN=(.+)$') { $env:TUNNEL_TOKEN = $Matches[1].Trim() } }
  }
  if (-not $env:TUNNEL_TOKEN) {
    Write-Host "Set TUNNEL_TOKEN=... in node\.env first (see README.md, 'Public HTTPS address')."
    exit 1
  }
  docker compose --profile tunnel up -d --build
} else {
  docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Waiting for the onion address...'
$onion = ''
for ($i = 0; $i -lt 60 -and -not $onion; $i++) {
  $onion = (docker compose exec -T tor cat /var/lib/tor/rastro/hostname 2>$null | Out-String).Trim()
  if (-not $onion) { Start-Sleep -Seconds 2 }
}
if (-not $onion) { $onion = '<not ready yet, run start.ps1 again>' }

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback' } |
  Select-Object -First 1).IPAddress
if (-not $ip) { $ip = '<this-ip>' }
$relayPort = if ($env:RELAY_PORT) { $env:RELAY_PORT } else { '7777' }
$photosPort = if ($env:PHOTOS_PORT) { $env:PHOTOS_PORT } else { '3000' }

Write-Host ''
Write-Host 'Rastro node is running.'
Write-Host ''
Write-Host "  On this computer:  relay ws://localhost:$relayPort   photos http://localhost:$photosPort"
Write-Host "  On your network:   relay ws://${ip}:$relayPort   photos http://${ip}:$photosPort"
Write-Host "  Over Tor:          relay ws://$onion   photos http://${onion}:3000"
Write-Host ''
Write-Host '  To mirror another community node:  .\sync.ps1 wss://their-relay.example'
Write-Host '  To stop:                           docker compose down'
