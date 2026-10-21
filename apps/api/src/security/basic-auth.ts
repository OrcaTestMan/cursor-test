import { timingSafeEqual } from 'node:crypto'

export const TEMP_BASIC_AUTH_REALM = 'Nex'
export const TEMP_BASIC_AUTH_MESSAGE = '인증이 필요합니다.'

export function readTempBasicAuthCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { user: string; pass: string } | null {
  const user = (env.TEMP_BASIC_AUTH_USER ?? '').trim()
  const pass = (env.TEMP_BASIC_AUTH_PASS ?? '').trim()
  if (!user || !pass) return null
  return { user, pass }
}

/** 길이가 달라도 expected 길이만큼 비교해 시간차 누설을 줄인다. */
export function timingSafeEqualText(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual)
  const expectedBuf = Buffer.from(expected)
  const compare =
    actualBuf.length === expectedBuf.length
      ? actualBuf
      : Buffer.alloc(expectedBuf.length)
  return (
    timingSafeEqual(compare, expectedBuf) && actualBuf.length === expectedBuf.length
  )
}

export function parseBasicAuthHeader(
  header: string | undefined,
): { user: string; pass: string } | null {
  if (!header) return null
  const match = /^Basic\s+(\S+)$/i.exec(header.trim())
  if (!match) return null
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8')
    const sep = decoded.indexOf(':')
    if (sep < 0) return null
    return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) }
  } catch {
    return null
  }
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  const ip = address.trim().toLowerCase()
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}

export function isLocalHealthBypass(req: {
  method?: string
  path?: string
  originalUrl?: string
  socket?: { remoteAddress?: string }
}): boolean {
  if ((req.method || '').toUpperCase() !== 'GET') return false
  const path = (req.path || req.originalUrl?.split('?')[0] || '').split('?')[0]
  if (path !== '/api/health') return false
  return isLoopbackAddress(req.socket?.remoteAddress)
}

export function credentialsMatch(
  provided: { user: string; pass: string } | null,
  expected: { user: string; pass: string },
): boolean {
  const actual = provided ?? { user: '', pass: '' }
  const userOk = timingSafeEqualText(actual.user, expected.user)
  const passOk = timingSafeEqualText(actual.pass, expected.pass)
  return userOk && passOk
}
