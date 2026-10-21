export function omitPasswordHash<T extends { passwordHash?: unknown }>(
  row: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _ignored, ...rest } = row
  return rest
}

export function maskIp(ip: string): string {
  const value = String(ip || '').trim()
  if (!value) return ''
  const parts = value.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`
  if (value.includes(':')) {
    const chunks = value.split(':')
    return `${chunks.slice(0, 2).join(':')}:****`
  }
  return '***'
}

export function maskAccount(value: string): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= 4) return '****'
  return `${'*'.repeat(text.length - 4)}${text.slice(-4)}`
}

export function publicUser<
  T extends { passwordHash?: unknown; lastIp?: string; withdrawAccount?: string },
>(row: T, detail: boolean) {
  const base = omitPasswordHash(row)
  if (detail) return base
  return {
    ...base,
    lastIp: maskIp(String(base.lastIp || '')),
    withdrawAccount: maskAccount(String(base.withdrawAccount || '')),
  }
}
