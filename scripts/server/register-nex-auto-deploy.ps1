# Recreate NexGitAutoPull (Disabled until tests pass). Requires elevation.
# Does not touch firewall 3389/5432.
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runner = Join-Path $PSScriptRoot 'run-auto-deploy.ps1'
$taskName = 'NexGitAutoPull'
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path $runner)) { throw "missing $runner" }

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
  -WorkingDirectory $root

$start = (Get-Date).AddMinutes(1)
$trigger = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes 1) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# Docker Desktop needs a user session; Interactive + Highest.
# "Do not start a new instance" + script lock prevent overlap.
$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances IgnoreNew `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -RestartCount 0

$principal = New-ScheduledTaskPrincipal `
  -UserId $user `
  -LogonType Interactive `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Safe auto-deploy: fetch/pull main via deploy-safe.mjs (lock, migrate gate, rollback)' `
  -Force | Out-Null

# Stay Disabled until deploy-test suite passes
Disable-ScheduledTask -TaskName $taskName | Out-Null

$t = Get-ScheduledTask -TaskName $taskName
$info = @{
  TaskName = $t.TaskName
  State = $t.State.ToString()
  User = $t.Principal.UserId
  RunLevel = $t.Principal.RunLevel.ToString()
  LogonType = $t.Principal.LogonType.ToString()
  MultipleInstances = $t.Settings.MultipleInstances.ToString()
  Action = $t.Actions[0].Execute + ' ' + $t.Actions[0].Arguments
  Runner = $runner
  Root = $root
}
$info | ConvertTo-Json -Compress
Write-Host "REGISTER_OK state=$($t.State)"
