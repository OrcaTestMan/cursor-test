# NexGitAutoPull entry: calls scripts/deploy-safe.mjs
# Keep DEPLOY_BRANCH=main in production. Override env for tests.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [Environment]::GetEnvironmentVariable('Path', 'User') +
  ';C:\Program Files\Git\cmd;C:\Program Files\nodejs;C:\Program Files\Docker\Docker\resources\bin'

if (-not $env:DEPLOY_BRANCH -or [string]::IsNullOrWhiteSpace($env:DEPLOY_BRANCH)) {
  $env:DEPLOY_BRANCH = 'main'
}
if (-not $env:DEPLOY_STATE_DIR) { $env:DEPLOY_STATE_DIR = 'C:\nex\logs' }
if (-not $env:DEPLOY_ROOT) { $env:DEPLOY_ROOT = $root }
if (-not $env:HEALTH_URL) { $env:HEALTH_URL = 'http://127.0.0.1:3000/api/health' }

Set-Location $root
& node (Join-Path $root 'scripts\deploy-safe.mjs')
exit $LASTEXITCODE
