import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AdminRole } from './admin-roles.js'
import { ROLES_KEY } from './auth.decorators.js'
import type { AuthedRequest } from './auth.guard.js'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles || roles.length === 0) return true
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    if (!req.admin) return true
    if (!roles.includes(req.admin.role)) {
      throw new ForbiddenException('권한이 없습니다.')
    }
    return true
  }
}
