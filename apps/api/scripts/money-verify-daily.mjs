/**
 * 잔액 검증 일일 작업 (로컬/서버 스케줄러에서 호출).
 * 알림 채널은 아침 결정 — 지금은 파일 로그만.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const logDir = path.join(root, 'logs')
fs.mkdirSync(logDir, { recursive: true })

const day = new Date().toISOString().slice(0, 10)
const logFile = path.join(logDir, `money-verify-${day}.log`)

const dbUrl =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(dbUrl) && process.env.ALLOW_REMOTE_DB !== '1') {
  console.error('money-verify-daily refused remote DB without ALLOW_REMOTE_DB=1')
  process.exit(2)
}
const sql = postgres(dbUrl, { max: 1 })

const query = `
SELECT u.id, u.login, u.money AS wallet,
       COALESCE(SUM(m.amount), 0) AS ledger_sum,
       (u.money - COALESCE(SUM(m.amount), 0)) AS diff
FROM nex_users u
LEFT JOIN nex_money_moves m ON m.user_id = u.id
GROUP BY u.id
HAVING u.money <> COALESCE(SUM(m.amount), 0)
ORDER BY u.id
`

const started = new Date().toISOString()
let rows = []
let error = null
try {
  rows = await sql.unsafe(query)
} catch (err) {
  error = String(err?.stack || err)
}

const payload = {
  started,
  finished: new Date().toISOString(),
  mismatchCount: rows.length,
  mismatches: rows,
  error,
  ok: !error && rows.length === 0,
}

const line = JSON.stringify(payload)
fs.appendFileSync(logFile, line + '\n', 'utf8')
console.log(line)

await sql.end()
process.exitCode = payload.ok ? 0 : 1
