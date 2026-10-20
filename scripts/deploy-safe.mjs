/**
 * 안전 배포 가드 (서버 적용 전 로컬/스테이징에서 검증용).
 * 실제 서버 스케줄러 연결은 대표님 승인 후.
 *
 * 순서: install → build → test → (옵션) restart → health
 * 빌드/테스트 실패 시 재시작하지 않음.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const ROOT = process.cwd()
const API = process.env.HEALTH_URL || 'http://127.0.0.1:3000/api/health'
const DO_RESTART = process.env.DEPLOY_RESTART === '1'
const PREV_SHA_FILE = new URL('../.deploy-prev-sha', import.meta.url)

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.join(' '))
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    ...opts,
  })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with ${r.status}`)
  }
}

async function healthOk() {
  const res = await fetch(API)
  if (!res.ok) return false
  const body = await res.json()
  return body?.status === 'ok' && body?.db === 'up'
}

async function main() {
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    cwd: ROOT,
  }).stdout.trim()
  console.log('deploy-safe start', { sha, DO_RESTART })

  run('yarn', ['install', '--frozen-lockfile'])
  run('yarn', ['workspace', 'api', 'build'])
  run('yarn', ['workspace', 'web', 'build'])
  run('yarn', ['workspace', 'api', 'test'])

  if (!DO_RESTART) {
    console.log('DEPLOY_RESTART!=1 → skip restart (dry run OK)')
    return
  }

  fs.writeFileSync(PREV_SHA_FILE, sha, 'utf8')
  // 자리표시자: pm2 reload api || nssm restart ...
  console.log('TODO: restart process manager here')

  const ok = await healthOk()
  if (!ok) {
    console.error('health failed — rollback to previous sha required')
    process.exit(2)
  }
  console.log('deploy-safe OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
