# beforeSubmitPrompt: 마지막 사용자 요청을 저장 (작업내역·커밋 메시지용)
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }

$prompt = ''
try {
  $j = $raw | ConvertFrom-Json
  foreach ($key in @('prompt', 'user_message', 'userMessage', 'text', 'content')) {
    if ($j.PSObject.Properties[$key]) {
      $prompt = [string]$j.$key
      if ($prompt) { break }
    }
  }
} catch {}

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root '.git'))) {
  $root = Get-Location
}
$path = Join-Path $root '.cursor\last-user-request.txt'
$dir = Split-Path $path -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

if ($prompt.Trim()) {
  if ($prompt.Length -gt 2000) { $prompt = $prompt.Substring(0, 2000) + '…' }
  Set-Content -Path $path -Value $prompt.Trim() -Encoding utf8
}
exit 0
