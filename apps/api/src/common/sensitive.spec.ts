import { describe, expect, it } from 'vitest'
import { maskAccount, maskIp, omitPasswordHash, publicUser } from './sensitive.js'

describe('sensitive', () => {
  it('passwordHash 를 뺀다', () => {
    expect(omitPasswordHash({ id: 1, passwordHash: 'x', login: 'a' })).toEqual({
      id: 1,
      login: 'a',
    })
  })

  it('목록에서는 IP·계좌를 가린다', () => {
    expect(maskIp('183.106.213.25')).toBe('183.106.***.***')
    expect(maskAccount('110-222-3333')).toBe('********3333')
    const row = publicUser(
      {
        id: 1,
        login: 'u',
        passwordHash: 'secret',
        lastIp: '10.0.0.8',
        withdrawAccount: '12345678',
      },
      false,
    )
    expect(row).not.toHaveProperty('passwordHash')
    expect(row.lastIp).toBe('10.0.***.***')
    expect(row.withdrawAccount).toBe('****5678')
  })

  it('상세에서는 IP·계좌 전체를 두고 해시만 뺀다', () => {
    const row = publicUser(
      {
        id: 1,
        passwordHash: 'secret',
        lastIp: '10.0.0.8',
        withdrawAccount: '12345678',
      },
      true,
    )
    expect(row.lastIp).toBe('10.0.0.8')
    expect(row.withdrawAccount).toBe('12345678')
    expect(row).not.toHaveProperty('passwordHash')
  })
})
