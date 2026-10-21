import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthService, type AdminActor } from './auth.service.js'

export type AuthedRequest = Request & { admin?: AdminActor }

function requestPath(req: Request) {
  return (req.path || req.url || '').split('?')[0]
}

function isPublicApi(req: Request) {
  const method = (req.method || 'GET').toUpperCase()
  const path = requestPath(req)
  if (method === 'OPTIONS') return true
  if (method === 'GET' && path === '/api/health') return true
  if (method === 'POST' && path === '/api/auth/login') return true
  if (method === 'GET' && (path === '/api/auth/otp' || path === '/auth/otp')) return true
  return false
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    if (isPublicApi(req)) return true
    this.auth.assertOrigin(req)
    req.admin = await this.auth.requireAdmin(req)
    return true
  }
}
