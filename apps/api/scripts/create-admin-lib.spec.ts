import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  cliArg,
  containsSecret,
  generateAdminPassword,
  hasCliFlag,
  MIN_PASSWORD_LENGTH,
  safeAdminLogin,
  secretFileBody,
  secretFilePaths,
  writeSecretText,
} from './create-admin-lib.mjs'

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('create-admin-lib', () => {
  it('공백·등호 인자를 모두 읽는다', () => {
    expect(cliArg(['--login', 'boss1'], 'login')).toBe('boss1')
    expect(cliArg(['--login=boss1'], 'login')).toBe('boss1')
    expect(hasCliFlag(['--password=x'], 'password')).toBe(true)
    expect(hasCliFlag(['--login=boss1'], 'password')).toBe(false)
  })

  it('아이디를 파일명에 안전하게 받는다', () => {
    expect(safeAdminLogin('ops_admin')).toBe('ops_admin')
    expect(safeAdminLogin('../etc')).toBe('')
    expect(safeAdminLogin('a b')).toBe('')
  })

  it('비밀번호는 24자 이상 랜덤이다', () => {
    const a = generateAdminPassword()
    const b = generateAdminPassword()
    expect(a.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
    expect(b.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
    expect(a).not.toBe(b)
  })

  it('비밀 파일만 쓰고 경로 문자열에는 비밀이 없다', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'nex-admin-'))
    dirs.push(dir)
    const login = 'boss1'
    const password = generateAdminPassword()
    const totpSecret = 'JBSWY3DPEHPK3PXP'
    const files = secretFilePaths(login, dir)
    writeSecretText(
      files.text,
      secretFileBody({ login, password, totpSecret }),
    )
    const body = readFileSync(files.text, 'utf8')
    expect(body).toContain(`login=${login}`)
    expect(body).toContain(`password=${password}`)
    expect(body).toContain(`totp_secret=${totpSecret}`)
    const printed = `${files.text}\n${files.qr}`
    expect(containsSecret(printed, [password, totpSecret, 'otpauth://'])).toBe(
      false,
    )
  })
})
