import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AUTH_LEVEL_KEY, type AuthLevel } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { AuthRequest } from './auth.types.js';
import { clearSessionCookie, readSessionToken } from './session-cookie.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const http = context.switchToHttp();
    const req = http.getRequest<AuthRequest>();

    const token = readSessionToken(req);
    if (token) {
      const user = await this.authService.resolveSession(token);
      if (user) {
        req.user = user;
      } else {
        clearSessionCookie(http.getResponse<Response>());
      }
    }

    const level = this.reflector.getAllAndOverride<AuthLevel | undefined>(
      AUTH_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!level) {
      return true;
    }
    if (!req.user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    if (level === 'admin' && req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 이용할 수 있습니다.');
    }
    return true;
  }
}
