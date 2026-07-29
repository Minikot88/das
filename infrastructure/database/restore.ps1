param(
  [Parameter(Mandatory = $true)]
  [string]$InputFile
)

$ErrorActionPreference = 'Stop'
$resolvedInput = [System.IO.Path]::GetFullPath($InputFile)
if (-not (Test-Path -LiteralPath $resolvedInput -PathType Leaf)) { throw "Backup file does not exist: $resolvedInput" }
$checksumFile = "$resolvedInput.sha256"
if (Test-Path -LiteralPath $checksumFile) {
  $expected = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedInput).Hash.ToLowerInvariant()
  if ($expected -ne $actual) { throw 'Backup checksum verification failed.' }
}

$suffix = ([guid]::NewGuid().ToString('N')).Substring(0, 12)
$temporaryDatabase = "dashboard_restore_$suffix"
$containerFile = "/backups/restore-$suffix.dump"
docker compose cp $resolvedInput "postgres:$containerFile"
if ($LASTEXITCODE -ne 0) { throw 'Could not copy backup into the PostgreSQL container.' }

try {
  docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" createdb --username="$POSTGRES_USER" "$1"' -- $temporaryDatabase
  if ($LASTEXITCODE -ne 0) { throw 'Could not create temporary restore database.' }
  docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --exit-on-error --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$1" "$2"' -- $temporaryDatabase $containerFile
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL restore failed.' }
  $migrationUser = (docker compose exec -T postgres printenv POSTGRES_USER).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $migrationUser) { throw 'Could not resolve the PostgreSQL migration user.' }
  $runtimeUser = (docker compose exec -T postgres printenv POSTGRES_RUNTIME_USER).Trim()
  if ($LASTEXITCODE -ne 0 -or $runtimeUser -notmatch '^[a-zA-Z0-9_]+$') {
    throw 'Could not resolve a safe PostgreSQL runtime user.'
  }
  docker compose exec -T postgres psql --set=ON_ERROR_STOP=1 --username=$migrationUser --dbname=$temporaryDatabase --set=runtime_user=$runtimeUser --command='GRANT USAGE ON SCHEMA public TO :"runtime_user"; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_user"; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_user"; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_user"; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"runtime_user";'
  if ($LASTEXITCODE -ne 0) { throw 'Could not restore PostgreSQL runtime privileges.' }
  $verificationQuery = 'SELECT (SELECT COUNT(*) FROM _prisma_migrations), (SELECT COUNT(*) FROM bi_projects), (SELECT COUNT(*) FROM datasets), (SELECT COUNT(*) FROM charts), (SELECT COUNT(*) FROM bi_dashboards), (SELECT COUNT(*) FROM dashboard_widgets);'
  $verification = docker compose exec -T postgres psql --tuples-only --no-align --username=$migrationUser --dbname=$temporaryDatabase --command=$verificationQuery
  if ($LASTEXITCODE -ne 0) { throw 'Restored database verification failed.' }
  Write-Output ([pscustomobject]@{ TemporaryDatabase = $temporaryDatabase; CoreCounts = ($verification.Trim()); Verified = $true })
}
finally {
  docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists --force --username="$POSTGRES_USER" "$1"' -- $temporaryDatabase | Out-Null
  docker compose exec -T postgres rm -f $containerFile | Out-Null
}
