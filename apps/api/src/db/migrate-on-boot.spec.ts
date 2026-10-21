import { describe, expect, it } from 'vitest'
import { shouldMigrateOnBoot } from './migrate-on-boot.js'

describe('shouldMigrateOnBoot', () => {
  it('운영·미설정에서는 기동 시 마이그레이션을 하지 않는다', () => {
    expect(shouldMigrateOnBoot({ NODE_ENV: 'production' })).toBe(false)
    expect(shouldMigrateOnBoot({})).toBe(false)
  })

  it('개발·테스트에서만 기동 시 적용한다', () => {
    expect(shouldMigrateOnBoot({ NODE_ENV: 'development' })).toBe(true)
    expect(shouldMigrateOnBoot({ NODE_ENV: 'test' })).toBe(true)
  })
})
