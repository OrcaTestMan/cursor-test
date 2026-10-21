import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, 'create-admin.mjs')

function run(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: 'postgresql://nex:nex@127.0.0.1:5432/nex' },
  })
}

describe('create-admin CLI', () => {
  it('--password 인자를 거부하고 비밀을 출력하지 않는다', () => {
    const r = run(['--login=boss1', '--password=SuperSecretValue99!!'])
    const out = `${r.stdout || ''}${r.stderr || ''}`
    expect(r.status).not.toBe(0)
    expect(out).toContain('do not pass --password')
    expect(out).not.toContain('SuperSecretValue99!!')
    expect(out).not.toContain('otpauth://')
  })

  it('사용법만 안내하고 비밀 키워드를 출력하지 않는다', () => {
    const r = run([])
    const out = `${r.stdout || ''}${r.stderr || ''}`
    expect(r.status).not.toBe(0)
    expect(out.toLowerCase()).toContain('usage')
    expect(out).not.toContain('otpauth://')
    expect(out).not.toContain('totp_secret')
  })
})
