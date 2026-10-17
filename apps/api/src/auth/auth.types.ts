import type { Request } from 'express';
import type { Role, UserStatus } from '../db/columns.js';

export type AuthUser = {
  id: number;
  username: string;
  nickname: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
};

export type AuthRequest = Request & { user?: AuthUser };
