export const SESSION_COOKIE = 'nex_admin_sid'
export const OTP_SETTING_KEY = 'auth.otpRequired'
export const IDLE_MS = 30 * 60 * 1000
export const MAX_LIFE_MS = 12 * 60 * 60 * 1000
export const FAIL_LIMIT = 5
export const LOCK_MS = 15 * 60 * 1000
export const MIN_ADMIN_PASSWORD = 10

export function cookieSecure() {
  return process.env.AUTH_COOKIE_SECURE === '1'
}

/** 1일 때만 5회 실패 → 15분 잠금. 없거나 0이면 잠금 없음. */
export function loginLockoutEnabled() {
  return process.env.ADMIN_LOGIN_LOCKOUT === '1'
}
