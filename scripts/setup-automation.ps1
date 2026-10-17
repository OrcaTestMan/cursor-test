# 최초 1회(또는 clone 후): Git hooks 경로 등록
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
git config core.hooksPath .githooks
Write-Host "core.hooksPath = .githooks"
Write-Host "Cursor hooks: .cursor/hooks.json (beforeSubmitPrompt + stop)"
Write-Host "Done. Agent 종료 시 변경 있으면 작업내역+commit, commit 후 자동 push."
