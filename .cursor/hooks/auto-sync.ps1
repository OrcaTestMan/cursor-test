# stop: 변경 있으면 작업내역 갱신 → commit → post-commit hook이 push
$ErrorActionPreference = 'Stop'
[Console]::In.ReadToEnd() | Out-Null

$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root '.git'))) {
  $parent = Split-Path $root -Parent
  if (-not $parent -or $parent -eq $root) { break }
  $root = $parent
}
if (-not (Test-Path (Join-Path $root '.git'))) { exit 0 }
Set-Location $root

$ignorePattern = '(^|/)(\.cursor/last-user-request\.txt|\.cursor/auto-sync\.log)$'
$porcelain = git status --porcelain 2>$null
if (-not $porcelain) { exit 0 }

$meaningful = @()
foreach ($line in ($porcelain -split "`n")) {
  if (-not $line.Trim()) { continue }
  $path = $line.Substring(3).Trim('"')
  if ($path -match $ignorePattern) { continue }
  $meaningful += $line
}
if ($meaningful.Count -eq 0) { exit 0 }

$requestPath = Join-Path $root '.cursor\last-user-request.txt'
$request = 'Agent 작업 (자동 기록)'
if (Test-Path $requestPath) {
  $t = (Get-Content $requestPath -Raw -ErrorAction SilentlyContinue).Trim()
  if ($t) { $request = ($t -replace '\s+', ' ').Trim() }
}

try {
  $tz = [TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')
  $stamp = [TimeZoneInfo]::ConvertTimeFromUtc((Get-Date).ToUniversalTime(), $tz).ToString('yyyy-MM-dd HH:mm')
} catch {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
}

$names = git diff --name-only 2>$null
if (-not $names) { $names = git diff --cached --name-only 2>$null }
$untracked = git ls-files --others --exclude-standard 2>$null
if ($untracked) { $names = @($names + $untracked) | Select-Object -Unique }
$fileList = ($names | Where-Object { $_ -and $_ -notmatch $ignorePattern }) -join ', '
if (-not $fileList) { $fileList = '(변경 파일)' }

$stat = (git diff --stat 2>$null | Select-Object -Last 1) -join ' '
if (-not $stat) { $stat = '자동 동기화' }

$logPath = Join-Path $root '.cursor\auto-sync.log'
$historyPath = Join-Path $root '작업내역.md'
$entry = @"

## $stamp KST
- 요청: $request
- 수정: $stat
- 파일: $fileList
- 정리: 없음
- 검증: N/A (자동 동기화)

"@

if (-not (Test-Path $historyPath)) {
  Set-Content -Path $historyPath -Value "# 작업내역`n`n최신 기록이 위에 온다.`n" -Encoding utf8
}
$content = Get-Content $historyPath -Raw -Encoding utf8
$marker = "최신 기록이 위에 온다."
if ($content -match [regex]::Escape($marker)) {
  $content = $content -replace ([regex]::Escape($marker)), ($marker + $entry)
} else {
  $content = $entry + $content
}
Set-Content -Path $historyPath -Value $content -Encoding utf8 -NoNewline

git add -A 2>$null
git reset -- .cursor/last-user-request.txt .cursor/auto-sync.log 2>$null
if (git diff --cached --quiet 2>$null) { exit 0 }

$msg = ($request -replace '[\r\n]+', ' ')
if ($msg.Length -gt 72) { $msg = $msg.Substring(0, 72) + '…' }
if (-not $msg -or $msg -eq 'Agent 작업 (자동 기록)') { $msg = "chore: auto-sync $stamp" }

$msgFile = Join-Path $root '.cursor\commit-msg.tmp'
Set-Content -Path $msgFile -Value $msg -Encoding utf8 -NoNewline
$commitOut = git commit -F $msgFile 2>&1
Remove-Item -Path $msgFile -Force -ErrorAction SilentlyContinue
Add-Content -Path $logPath -Value "[$stamp] $commitOut"
exit 0
