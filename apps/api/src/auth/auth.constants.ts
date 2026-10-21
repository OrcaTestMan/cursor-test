export const SESSION_COOKIE = 'nex_admin_sid'
export const IDLE_MS = 30 * 60 * 1000
export const MAX_LIFE_MS = 12 * 60 * 60 * 1000
export const FAIL_LIMIT = 5
export const LOCK_MS = 15 * 60 * 1000
export const MIN_ADMIN_PASSWORD = 10

export function cookieSecure() {
  return process.env.AUTH_COOKIE_SECURE === '1'
}
