# NEX PostgreSQL 로컬/서버 초기화
# 사용: 프로젝트 루트에서  powershell -ExecutionPolicy Bypass -File scripts/setup-nex-db.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host '1) Docker PostgreSQL (nex / nex / 127.0.0.1:5432)'
docker compose up -d --wait

$envFile = 'apps/api/.env'
$example = 'apps/api/.env.example'
if (-not (Test-Path $envFile)) {
  Copy-Item $example $envFile
  Write-Host "created $envFile"
}

$envText = Get-Content $envFile -Raw
if ($envText -notmatch 'DATABASE_URL=postgresql://nex:nex@localhost:5432/nex') {
  $envText = $envText -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql://nex:nex@localhost:5432/nex'
  Set-Content -Path $envFile -Value $envText -NoNewline
  Write-Host 'updated DATABASE_URL -> nex database'
}

Write-Host '2) yarn install (필요 시)'
yarn install

Write-Host '3) migrate'
yarn workspace api db:migrate

Write-Host '4) seed'
yarn workspace api db:seed

Write-Host '완료. API health: http://localhost:3000/api/health'
Write-Host 'NEX 화면: http://localhost:5173/nex/dashboard.html'
