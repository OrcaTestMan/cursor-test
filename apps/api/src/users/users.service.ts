import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { pageParams } from '../common/pagination.js';
import { likePattern } from '../common/text.js';
import { adminUserColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { sessions, users } from '../db/schema.js';
import { AdminListUsersDto, UpdateUserDto } from './dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  async list(query: AdminListUsersDto) {
    const { page, pageSize, offset } = pageParams(query);
    const conditions: SQL[] = [];
    if (query.q) {
      const pattern = likePattern(query.q);
      const text = or(
        ilike(users.username, pattern),
        ilike(users.nickname, pattern),
      );
      if (text) {
        conditions.push(text);
      }
    }
    if (query.status) {
      conditions.push(eq(users.status, query.status));
    }
    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminUserColumns)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);
    return { items, total, page, pageSize };
  }

  recent(limit: number) {
    return this.dbService.db
      .select(adminUserColumns)
      .from(users)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit);
  }

  async get(id: number) {
    const [user] = await this.dbService.db
      .select(adminUserColumns)
      .from(users)
      .where(eq(users.id, id));
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    return user;
  }

  async update(admin: AuthUser, id: number, dto: UpdateUserDto) {
    await this.get(id);
    if (
      admin.id === id &&
      (dto.status === 'blocked' || dto.role === 'user')
    ) {
      throw new BadRequestException(
        '자기 자신은 차단하거나 권한을 내릴 수 없습니다.',
      );
    }

    let blockedReason: string | null | undefined;
    if (dto.status === 'active') {
      blockedReason = null;
    } else if (dto.blockedReason !== undefined) {
      blockedReason = dto.blockedReason || null;
    }

    await this.dbService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: dto.role, status: dto.status, blockedReason })
        .where(eq(users.id, id));
      if (dto.status === 'blocked') {
        await tx.delete(sessions).where(eq(sessions.userId, id));
      }
    });
    return this.get(id);
  }
}
