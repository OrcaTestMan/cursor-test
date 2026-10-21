export const ADMIN_ROLES = ['superadmin', 'operator', 'agent'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: '최고관리자',
  operator: '운영자',
  agent: '상담원',
}

export const OPS_ROLES: AdminRole[] = ['superadmin', 'operator']

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value)
}
