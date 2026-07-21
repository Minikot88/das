param(
  [Parameter(Mandatory = $true)][string]$OutputFile
)
$ErrorActionPreference = 'Stop'
$resolvedParent = Resolve-Path -LiteralPath (Split-Path -Parent $OutputFile)
$resolvedOutput = Join-Path $resolvedParent (Split-Path -Leaf $OutputFile)
docker compose exec -T database sh -c 'mariadb-dump --single-transaction --routines --triggers -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' | Set-Content -LiteralPath $resolvedOutput -Encoding utf8
Write-Output "Backup written to $resolvedOutput"
