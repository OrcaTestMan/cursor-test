import { describe, expect, it } from 'vitest'
import { validateEnv } from './env.validation.js'

const base = {
  DATABASE_URL: 'postgresql://nex:nex@127.0.0.1:5432/nex',
}

describe('validateEnv', () => {
  it('DATABASE_URL 이 있으면 시작한다', () => {
    expect(() => validateEnv({ ...base })).not.toThrow()
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production' }),
    ).not.toThrow()
  })

  it('DATABASE_URL 이 없으면 시작하지 않는다', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/)
  })
})
