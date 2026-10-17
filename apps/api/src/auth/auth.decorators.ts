import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthRequest, AuthUser } from './auth.types.js';

export const AUTH_LEVEL_KEY = 'authLevel';

export type AuthLevel = 'login' | 'admin';

export const LoginRequired = () =>
  SetMetadata(AUTH_LEVEL_KEY, 'login' satisfies AuthLevel);

export const AdminOnly = () =>
  SetMetadata(AUTH_LEVEL_KEY, 'admin' satisfies AuthLevel);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);
