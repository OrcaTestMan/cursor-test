import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  credentialsMatch,
  isLocalHealthBypass,
  isLoopbackAddress,
  parseBasicAuthHeader,
  readTempBasicAuthCredentials,
  timingSafeEqualText,
} from './basic-auth.js'
import {
  BASIC_AUTH_FAIL_LIMIT,
  BASIC_AUTH_LOCK_MS,
  BasicAuthFailLimiter,
} from './basic-auth-limit.js'
import {
  basicAuthFailLimiter,
  createTempBasicAuthMiddleware,
  tempBasicAuthMiddleware,
} from './basic-auth.middleware.js'

describe('timingSafeEqualText', () => {
  it('같은 문자열이면 true다', () => {
    expect(timingSafeEqualText('secret-pass', 'secret-pass')).toBe(true)
  })

  it('다른 문자열이면 false다', () => {
    expect(timingSafeEqualText('secret-pass', 'secret-paXX')).toBe(false)
    expect(timingSafeEqualText('short', 'longer-value')).toBe(false)
  })
})

describe('parseBasicAuthHeader', () => {
  it('user:pass 를 읽는다', () => {
    const header = `Basic ${Buffer.from('ops:p@ss:extra', 'utf8').toString('base64')}`
    expect(parseBasicAuthHeader(header)).toEqual({
      user: 'ops',
      pass: 'p@ss:extra',
    })
  })

  it('없거나 형식이 아니면 null이다', () => {
    expect(parseBasicAuthHeader(undefined)).toBeNull()
    expect(parseBasicAuthHeader('Bearer abc')).toBeNull()
    expect(parseBasicAuthHeader(`Basic ${Buffer.from('nocolon', 'utf8').toString('base64')}`)).toBeNull()
  })
})

describe('isLoopbackAddress / isLocalHealthBypass', () => {
  it('루프백만 인정한다', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('::1')).toBe(true)
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('211.110.16.130')).toBe(false)
    expect(isLoopbackAddress('10.0.0.1')).toBe(false)
  })

  it('X-Forwarded-For 가 아니라 소켓 주소만 본다', () => {
    expect(
      isLocalHealthBypass({
        method: 'GET',
        path: '/api/health',
        socket: { remoteAddress: '211.110.16.130' },
      }),
    ).toBe(false)
    expect(
      isLocalHealthBypass({
        method: 'GET',
        path: '/api/health',
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe(true)
    expect(
      isLocalHealthBypass({
        method: 'POST',
        path: '/api/health',
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe(false)
    expect(
      isLocalHealthBypass({
        method: 'GET',
        path: '/api/users',
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe(false)
  })
})

describe('credentialsMatch', () => {
  const expected = { user: 'admin', pass: 'correct-horse' }

  it('둘 다 맞을 때만 true다', () => {
    expect(credentialsMatch({ user: 'admin', pass: 'correct-horse' }, expected)).toBe(
      true,
    )
    expect(credentialsMatch({ user: 'admin', pass: 'wrong' }, expected)).toBe(false)
    expect(credentialsMatch({ user: 'other', pass: 'correct-horse' }, expected)).toBe(
      false,
    )
    expect(credentialsMatch(null, expected)).toBe(false)
  })
})

describe('tempBasicAuthMiddleware', () => {
  const prevUser = process.env.TEMP_BASIC_AUTH_USER
  const prevPass = process.env.TEMP_BASIC_AUTH_PASS

  afterEach(() => {
    basicAuthFailLimiter.clear()
    if (prevUser === undefined) delete process.env.TEMP_BASIC_AUTH_USER
    else process.env.TEMP_BASIC_AUTH_USER = prevUser
    if (prevPass === undefined) delete process.env.TEMP_BASIC_AUTH_PASS
    else process.env.TEMP_BASIC_AUTH_PASS = prevPass
  })

  function mockRes() {
    return {
      headers: {} as Record<string, string>,
      statusCode: 200,
      body: undefined as unknown,
      setHeader(key: string, value: string) {
        this.headers[key] = value
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(body: unknown) {
        this.body = body
        return this
      },
    }
  }

  it('환경변수가 비어 있으면 통과한다', () => {
    delete process.env.TEMP_BASIC_AUTH_USER
    delete process.env.TEMP_BASIC_AUTH_PASS
    const next = vi.fn()
    const res = mockRes()
    tempBasicAuthMiddleware(
      { method: 'GET', path: '/api/users', headers: {}, socket: {} } as never,
      res as never,
      next,
    )
    expect(next).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
  })

  it('인증 실패면 401이고 next를 호출하지 않는다', () => {
    process.env.TEMP_BASIC_AUTH_USER = 'ops'
    process.env.TEMP_BASIC_AUTH_PASS = 'secret'
    const next = vi.fn()
    const res = mockRes()
    tempBasicAuthMiddleware(
      {
        method: 'GET',
        path: '/api/users',
        headers: {},
        socket: { remoteAddress: '211.110.16.130' },
      } as never,
      res as never,
      next,
    )
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(res.headers['WWW-Authenticate']).toBe('Basic realm="Nex"')
    expect(res.body).toMatchObject({ statusCode: 401, message: '인증이 필요합니다.' })
  })

  it('맞는 값이면 next를 호출한다', () => {
    process.env.TEMP_BASIC_AUTH_USER = 'ops'
    process.env.TEMP_BASIC_AUTH_PASS = 'secret'
    const next = vi.fn()
    const res = mockRes()
    const header = `Basic ${Buffer.from('ops:secret', 'utf8').toString('base64')}`
    tempBasicAuthMiddleware(
      {
        method: 'GET',
        path: '/api/users',
        headers: { authorization: header },
        socket: { remoteAddress: '211.110.16.130' },
      } as never,
      res as never,
      next,
    )
    expect(next).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
  })

  it('같은 IP에서 10회 실패하면 429이고 맞는 비밀번호도 거부한다. 15분이 지나면 해제된다', () => {
    process.env.TEMP_BASIC_AUTH_USER = 'ops'
    process.env.TEMP_BASIC_AUTH_PASS = 'secret'
    let now = 1_700_000_000_000
    const failLog = vi.fn()
    const limiter = new BasicAuthFailLimiter({ now: () => now }, failLog)
    const mw = createTempBasicAuthMiddleware(limiter)
    const okHeader = `Basic ${Buffer.from('ops:secret', 'utf8').toString('base64')}`
    const req = {
      method: 'GET',
      path: '/api/users',
      headers: {},
      socket: { remoteAddress: '203.0.113.10' },
    }

    for (let i = 0; i < BASIC_AUTH_FAIL_LIMIT - 1; i += 1) {
      const res = mockRes()
      const next = vi.fn()
      mw(req as never, res as never, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    }

    const tenth = mockRes()
    mw(req as never, tenth as never, vi.fn())
    expect(tenth.statusCode).toBe(429)
    expect(failLog).toHaveBeenCalledTimes(BASIC_AUTH_FAIL_LIMIT)
    expect(failLog.mock.calls[0][0]).toBe('203.0.113.10')
    expect(String(failLog.mock.calls[0])).not.toMatch(/secret/)

    const lockedOk = mockRes()
    const lockedNext = vi.fn()
    mw(
      { ...req, headers: { authorization: okHeader } } as never,
      lockedOk as never,
      lockedNext,
    )
    expect(lockedOk.statusCode).toBe(429)
    expect(lockedNext).not.toHaveBeenCalled()

    now += BASIC_AUTH_LOCK_MS
    const after = mockRes()
    const afterNext = vi.fn()
    mw(
      { ...req, headers: { authorization: okHeader } } as never,
      after as never,
      afterNext,
    )
    expect(afterNext).toHaveBeenCalledOnce()
    expect(after.statusCode).toBe(200)
  })

  it('다른 IP 실패는 이 IP를 잠그지 않는다', () => {
    process.env.TEMP_BASIC_AUTH_USER = 'ops'
    process.env.TEMP_BASIC_AUTH_PASS = 'secret'
    const limiter = new BasicAuthFailLimiter({ now: () => 1_700_000_000_000 }, vi.fn())
    const mw = createTempBasicAuthMiddleware(limiter)
    for (let i = 0; i < BASIC_AUTH_FAIL_LIMIT; i += 1) {
      mw(
        {
          method: 'GET',
          path: '/api/users',
          headers: {},
          socket: { remoteAddress: '203.0.113.20' },
        } as never,
        mockRes() as never,
        vi.fn(),
      )
    }
    const okHeader = `Basic ${Buffer.from('ops:secret', 'utf8').toString('base64')}`
    const res = mockRes()
    const next = vi.fn()
    mw(
      {
        method: 'GET',
        path: '/api/users',
        headers: { authorization: okHeader },
        socket: { remoteAddress: '203.0.113.10' },
      } as never,
      res as never,
      next,
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it('127.0.0.1 GET /api/health 는 인증 없이 통과한다', () => {
    process.env.TEMP_BASIC_AUTH_USER = 'ops'
    process.env.TEMP_BASIC_AUTH_PASS = 'secret'
    const next = vi.fn()
    const res = mockRes()
    tempBasicAuthMiddleware(
      {
        method: 'GET',
        path: '/api/health',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as never,
      res as never,
      next,
    )
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('readTempBasicAuthCredentials', () => {
  it('한쪽만 있으면 비활성이다', () => {
    expect(
      readTempBasicAuthCredentials({
        TEMP_BASIC_AUTH_USER: 'ops',
        TEMP_BASIC_AUTH_PASS: '',
      }),
    ).toBeNull()
  })
})
