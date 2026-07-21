param(
  [Parameter(Mandatory = $true)][string]$InputFile,
  [Parameter(Mandatory = $true)][switch]$ConfirmDataReplacement
)
$ErrorActionPreference = 'Stop'
$resolvedInput = Resolve-Path -LiteralPath $InputFile
if (-not $ConfirmDataReplacement) { throw 'Restore requires -ConfirmDataReplacement.' }
Get-Content -LiteralPath $resolvedInput -Raw | docker compose exec -T database sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"'
Write-Output "Restore completed from $resolvedInput"
