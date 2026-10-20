import { adminUserColumns, userColumns } from '../db/columns.js';
import { users } from '../db/schema.js';

/** 화면에 주는 `User` 모양 */
export const publicUserColumns = {
  ...userColumns,
  nicknameChangedAt: users.nicknameChangedAt,
};

/** 화면에 주는 `AdminUser` 모양 */
export const adminUserViewColumns = {
  ...adminUserColumns,
  nicknameChangedAt: users.nicknameChangedAt,
  blockedUntil: users.blockedUntil,
  blockedAt: users.blockedAt,
};

export const DELETED_USERNAME_PREFIX = 'deleted_';
export const DELETED_NICKNAME_PREFIX = '탈퇴회원';
