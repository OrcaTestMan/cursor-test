import { describe, expect, it } from 'vitest'
import { validateEnv } from './env.validation.js'

const base = {
  DATABASE_URL: 'postgresql://nex:nex@127.0.0.1:5432/nex',
}

describe('validateEnv', () => {
  it('개발에서는 임시 Basic 값이 없어도 시작한다', () => {
    expect(() => validateEnv({ ...base })).not.toThrow()
  })

  it('운영에서 TEMP_BASIC_AUTH_USER/PASS 가 비면 시작하지 않는다', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ADMIN_PASSWORD: 'long-enough-password',
      }),
    ).toThrow(/TEMP_BASIC_AUTH_USER/)

    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ADMIN_PASSWORD: 'long-enough-password',
        TEMP_BASIC_AUTH_USER: 'ops',
      }),
    ).toThrow(/TEMP_BASIC_AUTH_PASS/)
  })

  it('운영에서 값이 있으면 통과한다', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ADMIN_PASSWORD: 'long-enough-password',
        TEMP_BASIC_AUTH_USER: 'ops',
        TEMP_BASIC_AUTH_PASS: 'temporary-pass',
      }),
    ).not.toThrow()
  })
})
