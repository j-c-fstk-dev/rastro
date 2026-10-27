# Copies Rastro events both ways between this node and other relays (negentropy sync).
#   powershell -ExecutionPolicy Bypass -File .\sync.ps1 wss://relay.one.example wss://relay.two.example
# To repeat it, add a task in Task Scheduler that runs this command every 15 minutes.
param([Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)][string[]]$Peers)
# Native commands report through exit codes; Windows PowerShell 5 would otherwise stop on docker's stderr.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
# Only Rastro events: profiles, actions, witnesses, groups, comments and deletions.
$filter = '{"kinds":[0,3910,3911,33910,1111,5]}'
foreach ($peer in $Peers) {
  Write-Host "Syncing with $peer"
  docker compose exec -T relay /app/strfry sync $peer --filter $filter --dir both
}
