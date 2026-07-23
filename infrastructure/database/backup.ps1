param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'backups')
)

$ErrorActionPreference = 'Stop'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "dashboard-mini-bi-$stamp.dump"
$outputFile = Join-Path $resolvedOutput $fileName
$containerFile = "/backups/$fileName"

docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --file="$1"' -- $containerFile
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL backup failed with exit code $LASTEXITCODE." }
docker compose cp "postgres:$containerFile" $outputFile
if ($LASTEXITCODE -ne 0) { throw "Could not copy PostgreSQL backup from the container." }
docker compose exec -T postgres rm -f $containerFile
if ((Get-Item -LiteralPath $outputFile).Length -eq 0) { throw 'PostgreSQL backup produced an empty file.' }
$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputFile).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$outputFile.sha256" -Value "$checksum  $fileName" -Encoding ascii
foreach ($protectedFile in @($outputFile, "$outputFile.sha256")) {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($account in @($identity, 'NT AUTHORITY\SYSTEM', 'BUILTIN\Administrators')) {
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($account, 'FullControl', 'Allow')
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $protectedFile -AclObject $acl
}
Write-Output ([pscustomobject]@{ Backup = $outputFile; Checksum = $checksum; SizeBytes = (Get-Item -LiteralPath $outputFile).Length })
