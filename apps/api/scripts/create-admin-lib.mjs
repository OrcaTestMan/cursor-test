import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const DEFAULT_SECRETS_DIR = 'C:\\nex\\secrets'
export const MIN_PASSWORD_LENGTH = 24

export function safeAdminLogin(login) {
  const value = String(login || '').trim()
  if (!/^[A-Za-z0-9_][A-Za-z0-9_-]{0,38}$/.test(value)) return ''
  return value
}

export function generateAdminPassword() {
  return randomBytes(24).toString('base64url')
}

export function secretsDir(env = process.env) {
  return String(env.ADMIN_SECRETS_DIR || DEFAULT_SECRETS_DIR).trim() || DEFAULT_SECRETS_DIR
}

export function secretFilePaths(login, dir = secretsDir()) {
  const id = safeAdminLogin(login)
  return {
    text: path.join(dir, `admin-${id}.txt`),
    qr: path.join(dir, `admin-${id}-qr.png`),
  }
}

export function secretFileBody({ login, password, totpSecret }) {
  return [
    `login=${login}`,
    `password=${password}`,
    `totp_secret=${totpSecret}`,
    '',
  ].join('\n')
}

export function writeSecretText(filePath, body) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, body, { encoding: 'utf8', mode: 0o600 })
}

export function containsSecret(text, secrets) {
  const hay = String(text || '')
  return secrets.some((item) => item && hay.includes(item))
}

export function cliArg(argv, name, fallback = '') {
  const eq = argv.find((item) => item.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const idx = argv.indexOf(`--${name}`)
  if (idx >= 0) {
    const next = argv[idx + 1]
    if (next && !next.startsWith('--')) return next
  }
  return fallback
}

export function hasCliFlag(argv, name) {
  return argv.some((item) => item === `--${name}` || item.startsWith(`--${name}=`))
}
