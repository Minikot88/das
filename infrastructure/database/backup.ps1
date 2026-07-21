param(
  [Parameter(Mandatory = $true)][string]$OutputFile
)
$ErrorActionPreference = 'Stop'
$resolvedParent = Resolve-Path -LiteralPath (Split-Path -Parent $OutputFile)
$resolvedOutput = Join-Path $resolvedParent (Split-Path -Leaf $OutputFile)
$temporaryOutput = Join-Path $resolvedParent ".$(Split-Path -Leaf $OutputFile).$([guid]::NewGuid().ToString('N')).partial"
try {
  docker compose exec -T database sh -c 'mariadb-dump --single-transaction --routines --triggers -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' | Set-Content -LiteralPath $temporaryOutput -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw "Database backup failed with exit code $LASTEXITCODE." }
  if ((Get-Item -LiteralPath $temporaryOutput).Length -eq 0) { throw 'Database backup produced an empty file.' }
  Move-Item -LiteralPath $temporaryOutput -Destination $resolvedOutput -Force

  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($account in @($identity, 'NT AUTHORITY\SYSTEM', 'BUILTIN\Administrators')) {
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($account, 'FullControl', 'Allow')
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $resolvedOutput -AclObject $acl
} finally {
  if (Test-Path -LiteralPath $temporaryOutput) { Remove-Item -LiteralPath $temporaryOutput -Force }
}
Write-Output "Backup written to $resolvedOutput"
