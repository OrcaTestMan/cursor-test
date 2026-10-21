export const BASIC_AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000
export const BASIC_AUTH_FAIL_LIMIT = 10
export const BASIC_AUTH_LOCK_MS = 15 * 60 * 1000

export const TEMP_BASIC_AUTH_LOCKED_MESSAGE =
  '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.'

type FailState = {
  failures: number[]
  lockedUntil?: number
}

export function normalizeClientIp(address: string | undefined): string {
  if (!address) return 'unknown'
  const ip = address.trim().toLowerCase()
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1'
  return ip
}

function defaultFailLog(ip: string, at: number) {
  console.warn(`[basic-auth] ${new Date(at).toISOString()} ip=${ip} 인증 실패`)
}

/** IP별 Basic 인증 실패·잠금. 메모리만 쓰고 재시작하면 비운다. */
export class BasicAuthFailLimiter {
  private readonly store = new Map<string, FailState>()

  constructor(
    private readonly clock: { now: () => number } = { now: Date.now },
    private readonly onFail: (ip: string, at: number) => void = defaultFailLog,
  ) {}

  clear() {
    this.store.clear()
  }

  isLocked(ip: string): boolean {
    const rec = this.store.get(ip)
    if (!rec?.lockedUntil) return false
    if (this.clock.now() >= rec.lockedUntil) {
      rec.lockedUntil = undefined
      rec.failures = this.prune(rec.failures)
      if (rec.failures.length === 0) this.store.delete(ip)
      else this.store.set(ip, rec)
      return false
    }
    return true
  }

  recordFailure(ip: string): { locked: boolean; count: number } {
    const now = this.clock.now()
    this.onFail(ip, now)
    const rec = this.store.get(ip) ?? { failures: [] }
    rec.failures = this.prune(rec.failures)
    rec.failures.push(now)
    if (rec.failures.length >= BASIC_AUTH_FAIL_LIMIT) {
      rec.lockedUntil = now + BASIC_AUTH_LOCK_MS
    }
    this.store.set(ip, rec)
    return {
      locked: Boolean(rec.lockedUntil && now < rec.lockedUntil),
      count: rec.failures.length,
    }
  }

  private prune(failures: number[]) {
    const cutoff = this.clock.now() - BASIC_AUTH_FAIL_WINDOW_MS
    return failures.filter((at) => at > cutoff)
  }
}
