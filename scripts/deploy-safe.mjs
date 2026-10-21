/**
 * 서버 안전 자동 배포.
 * - 잠금 / dirty 거부 / 실패 커밋 스킵 / drizzle 신규 마이그레이션 대기
 * - ff-only pull → yarn install(immutable) → build → 단위 검사
 * - 성공 시 nssm restart nex-api + health (최대 60초)
 * - 빌드 실패: 이전 커밋으로 되돌리고 재빌드, API 재시작 없음
 * - health 실패: 롤백 후 재빌드·재시작·health
 *
 * env:
 *   DEPLOY_BRANCH     기본 main
 *   DEPLOY_ROOT       저장소 루트 (기본: 이 스크립트 기준)
 *   DEPLOY_STATE_DIR  기본 C:\nex\logs
 *   HEALTH_URL        기본 http://127.0.0.1:3000/api/health
 *   NSSM_PATH         nssm.exe 경로 (선택)
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendNotify } from '../apps/api/scripts/lib/notify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(process.env.DEPLOY_ROOT || path.join(__dirname, '..'))
const BRANCH = String(process.env.DEPLOY_BRANCH || 'main').trim() || 'main'
const STATE_DIR = process.env.DEPLOY_STATE_DIR || 'C:\\nex\\logs'
const HEALTH_URL = process.env.HEALTH_URL || 'http://127.0.0.1:3000/api/health'
const LOCK_FILE = path.join(STATE_DIR, 'deploy.lock')
const LOG_FILE = path.join(STATE_DIR, 'deploy.log')
const FAILED_SHA_FILE = path.join(STATE_DIR, 'deploy-failed-sha.txt')
const LOCK_STALE_MS = 45 * 60 * 1000
const HEALTH_TIMEOUT_MS = 60_000
const HEALTH_INTERVAL_MS = 2_000

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
}

function nowIso() {
  return new Date().toISOString()
}

function appendLog(result, fields) {
  ensureStateDir()
  const line = JSON.stringify({
    ts: nowIso(),
    branch: BRANCH,
    result,
    ...fields,
  })
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8')
  console.log('[deploy]', result, fields?.reason || '', fields?.from || '', '->', fields?.to || '')
}

async function notify(level, title, detail) {
  try {
    await sendNotify({ level, title, detail })
  } catch (err) {
    console.error('sendNotify failed', err?.message || err)
  }
}

function run(cmd, args, opts = {}) {
  const label = [cmd, ...args].join(' ')
  console.log('>', label)
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, ...opts.env },
    ...opts,
  })
  if (r.error) throw new Error(`${label}: ${r.error.message}`)
  if (r.status !== 0) {
    const errOut = `${r.stderr || ''}${r.stdout || ''}`.trim().slice(0, 2000)
    throw new Error(`${label} failed (${r.status})${errOut ? `: ${errOut}` : ''}`)
  }
  return r
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.status}): ${(r.stderr || '').trim()}`)
  }
  return (r.stdout || '').trim()
}

function findNssm() {
  if (process.env.NSSM_PATH && fs.existsSync(process.env.NSSM_PATH)) {
    return process.env.NSSM_PATH
  }
  const which = spawnSync('where.exe', ['nssm'], { encoding: 'utf8', shell: true })
  if (which.status === 0) {
    const first = (which.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean)
    if (first) return first
  }
  const winget = path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft\\WinGet\\Packages\\NSSM.NSSM_Microsoft.Winget.Source_8wekyb3d8bbwe\\nssm-2.24-101-g897c7ad\\win64\\nssm.exe',
  )
  if (fs.existsSync(winget)) return winget
  throw new Error('nssm.exe not found')
}

function acquireLock() {
  ensureStateDir()
  if (fs.existsSync(LOCK_FILE)) {
    const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs
    if (age < LOCK_STALE_MS) {
      appendLog('skipped', { reason: 'lock_held', ageMs: age })
      return false
    }
    try {
      fs.unlinkSync(LOCK_FILE)
    } catch {
      appendLog('skipped', { reason: 'lock_stale_unlink_failed' })
      return false
    }
  }
  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({ pid: process.pid, ts: nowIso(), branch: BRANCH }),
    'utf8',
  )
  return true
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE)
  } catch {
    /* ignore */
  }
}

function gitStatusPorcelain() {
  return runCapture('git', ['status', '--porcelain'])
}

function readFailedSha() {
  try {
    if (!fs.existsSync(FAILED_SHA_FILE)) return ''
    return fs.readFileSync(FAILED_SHA_FILE, 'utf8').trim()
  } catch {
    return ''
  }
}

function writeFailedSha(sha) {
  ensureStateDir()
  fs.writeFileSync(FAILED_SHA_FILE, `${sha}\n`, 'utf8')
}

function clearFailedShaIf(sha) {
  if (readFailedSha() === sha) {
    try {
      fs.unlinkSync(FAILED_SHA_FILE)
    } catch {
      /* ignore */
    }
  }
}

function newDrizzleMigrations(fromRef, toRef) {
  const out = spawnSync(
    'git',
    ['diff', '--diff-filter=A', '--name-only', `${fromRef}..${toRef}`, '--', 'apps/api/drizzle/'],
    { cwd: ROOT, encoding: 'utf8', shell: true },
  )
  if (out.status !== 0) {
    throw new Error(`git diff drizzle failed: ${(out.stderr || '').trim()}`)
  }
  return (out.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function healthOnce() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const body = await res.json()
    return body?.status === 'ok' && body?.db === 'up'
  } catch {
    return false
  }
}

async function waitHealth(maxMs = HEALTH_TIMEOUT_MS) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await healthOnce()) return true
    await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS))
  }
  return false
}

function sleepSeconds(sec) {
  spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Start-Sleep -Seconds ${sec}`],
    { shell: true },
  )
}

function restartApi() {
  const nssm = findNssm()
  // crash loop 후 SERVICE_PAUSED 대비: stop → continue → start
  spawnSync(nssm, ['stop', 'nex-api'], { cwd: ROOT, shell: true, encoding: 'utf8' })
  sleepSeconds(2)
  spawnSync(nssm, ['continue', 'nex-api'], { cwd: ROOT, shell: true, encoding: 'utf8' })
  const start = spawnSync(nssm, ['start', 'nex-api'], {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
  })
  if (start.status === 0) return
  const restart = spawnSync(nssm, ['restart', 'nex-api'], {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
  })
  if (restart.status !== 0) {
    const detail = `${start.stderr || ''} ${restart.stderr || ''} ${restart.stdout || ''}`.trim()
    throw new Error(`nssm start/restart nex-api failed: ${detail.slice(0, 500)}`)
  }
}

function checkoutSha(sha) {
  // 브랜치에 남긴 채 내용만 되돌림 (detached HEAD 방지)
  run('git', ['reset', '--hard', sha])
}

function installAndBuild() {
  // Yarn 4: lockfile 고정
  run('yarn', ['install', '--immutable'])
  // 타입 검사 포함 빌드 (web + api). 프론트 별도 서비스는 없음.
  run('yarn', ['workspace', 'web', 'build'])
  run('yarn', ['workspace', 'api', 'build'])
  // DB 미접속 단위 테스트만
  run('yarn', ['workspace', 'api', 'test'])
}

async function rollbackBuildOnly(prevSha, failedSha, reason) {
  console.error('build/check failed → rollback build only, no API restart')
  checkoutSha(prevSha)
  try {
    installAndBuild()
  } catch (err) {
    appendLog('failed', {
      reason: 'rollback_build_failed',
      from: failedSha,
      to: prevSha,
      detail: String(err?.message || err),
      cause: reason,
    })
    await notify('error', 'deploy rollback build failed', `${prevSha} after ${failedSha}: ${err}`)
    throw err
  }
  writeFailedSha(failedSha)
  appendLog('failed', {
    reason,
    from: prevSha,
    to: failedSha,
    rolledBackTo: prevSha,
    apiRestarted: false,
  })
  await notify('error', 'deploy build failed (no API restart)', `${failedSha}: ${reason}`)
}

async function rollbackWithRestart(prevSha, failedSha, reason) {
  console.error('health failed → rollback + rebuild + restart')
  checkoutSha(prevSha)
  installAndBuild()
  try {
    restartApi()
  } catch (err) {
    console.error('rollback restart attempt 1 failed, retry:', err?.message || err)
    sleepSeconds(3)
    restartApi()
  }
  const ok = await waitHealth()
  writeFailedSha(failedSha)
  if (!ok) {
    appendLog('rollback', {
      reason: 'rollback_health_failed',
      from: failedSha,
      to: prevSha,
      cause: reason,
    })
    await notify('error', 'deploy rollback health failed', `${prevSha} still unhealthy after ${failedSha}`)
    throw new Error('rollback health failed')
  }
  appendLog('rollback', {
    reason,
    from: failedSha,
    to: prevSha,
    apiRestarted: true,
    health: 'ok',
  })
  await notify('error', 'deploy health failed → rolled back', `${failedSha} → ${prevSha}: ${reason}`)
}

async function main() {
  process.chdir(ROOT)
  ensureStateDir()

  if (!acquireLock()) {
    process.exit(0)
  }

  let prevSha = ''
  let remoteSha = ''

  try {
    // PATH 보강 (작업 스케줄러 환경)
    const extra = ['C:\\Program Files\\Git\\cmd', 'C:\\Program Files\\nodejs']
    try {
      extra.push(path.dirname(findNssm()))
    } catch {
      /* restart 시점에 다시 검사 */
    }
    process.env.Path = [...extra, process.env.Path || process.env.PATH || ''].join(';')
    process.env.PATH = process.env.Path

    run('git', ['fetch', 'origin', BRANCH])

    prevSha = runCapture('git', ['rev-parse', 'HEAD'])
    remoteSha = runCapture('git', ['rev-parse', `origin/${BRANCH}`])

    if (prevSha === remoteSha) {
      appendLog('skipped', { reason: 'no_new_commits', from: prevSha, to: remoteSha })
      return
    }

    const dirty = gitStatusPorcelain()
    if (dirty) {
      appendLog('skipped', {
        reason: 'dirty_worktree',
        from: prevSha,
        to: remoteSha,
        detail: dirty.split(/\r?\n/).slice(0, 20).join(' | '),
      })
      await notify('warn', 'deploy skipped: dirty worktree', dirty.slice(0, 500))
      return
    }

    const failed = readFailedSha()
    if (failed && failed === remoteSha) {
      appendLog('skipped', {
        reason: 'same_as_previous_failure',
        from: prevSha,
        to: remoteSha,
      })
      return
    }

    const migrations = newDrizzleMigrations(prevSha, remoteSha)
    if (migrations.length > 0) {
      const detail = migrations.join(', ')
      appendLog('skipped', {
        reason: 'migration_manual_approval_required',
        from: prevSha,
        to: remoteSha,
        migrations,
      })
      await notify(
        'warn',
        '마이그레이션 포함, 수동 승인 필요',
        `${remoteSha}: ${detail}`,
      )
      return
    }

    appendLog('deploying', { reason: 'start', from: prevSha, to: remoteSha })

    run('git', ['pull', '--ff-only', 'origin', BRANCH])
    const afterPull = runCapture('git', ['rev-parse', 'HEAD'])
    if (afterPull !== remoteSha) {
      throw new Error(`pull landed on ${afterPull}, expected ${remoteSha}`)
    }

    try {
      installAndBuild()
    } catch (err) {
      await rollbackBuildOnly(prevSha, remoteSha, String(err?.message || err))
      return
    }

    let restartOk = false
    try {
      restartApi()
      restartOk = true
    } catch (err) {
      console.error('API restart failed after build:', err?.message || err)
    }
    const ok = restartOk && (await waitHealth())
    if (!ok) {
      await rollbackWithRestart(
        prevSha,
        remoteSha,
        restartOk ? 'health_timeout' : 'restart_failed',
      )
      return
    }

    clearFailedShaIf(remoteSha)
    appendLog('deployed', {
      reason: 'ok',
      from: prevSha,
      to: remoteSha,
      apiRestarted: true,
      health: 'ok',
    })
    console.log('deploy-safe OK', remoteSha)
  } catch (err) {
    const msg = String(err?.message || err)
    appendLog('failed', {
      reason: 'exception',
      from: prevSha || null,
      to: remoteSha || null,
      detail: msg.slice(0, 2000),
    })
    await notify('error', 'deploy exception', msg.slice(0, 1500))
    process.exitCode = 1
  } finally {
    releaseLock()
  }
}

main()
