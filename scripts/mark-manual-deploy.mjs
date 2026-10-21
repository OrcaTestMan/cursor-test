/**
 * 마이그레이션 수동 적용 후 자동 배포가 같은 커밋을 다시 건드리지 않게 기록을 맞춘다.
 * HEAD == origin/main 이면 deploy-safe 는 no_new_commits 로 끝난다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.DEPLOY_ROOT
  ? path.resolve(process.env.DEPLOY_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATE_DIR = process.env.DEPLOY_STATE_DIR || 'C:\\nex\\logs'
const LOG_FILE = path.join(STATE_DIR, 'deploy.log')
const FAILED_SHA_FILE = path.join(STATE_DIR, 'deploy-failed-sha.txt')

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: true })
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(r.stderr || '').trim()}`)
  }
  return (r.stdout || '').trim()
}

fs.mkdirSync(STATE_DIR, { recursive: true })
const head = git(['rev-parse', 'HEAD'])
let failed = ''
try {
  if (fs.existsSync(FAILED_SHA_FILE)) {
    failed = fs.readFileSync(FAILED_SHA_FILE, 'utf8').trim()
  }
} catch {
  failed = ''
}
if (failed && failed === head) {
  fs.unlinkSync(FAILED_SHA_FILE)
}
const line = JSON.stringify({
  ts: new Date().toISOString(),
  branch: process.env.DEPLOY_BRANCH || 'main',
  result: 'deployed',
  reason: 'manual_after_migration',
  to: head,
})
fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8')
console.log(LOG_FILE)
console.log(head)
