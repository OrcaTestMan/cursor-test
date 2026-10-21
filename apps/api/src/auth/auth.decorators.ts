import { SetMetadata } from '@nestjs/common'
import type { AdminRole } from './admin-roles.js'

export const ROLES_KEY = 'admin_roles'
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles)
