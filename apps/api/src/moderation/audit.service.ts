import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, like, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import { DbService } from '../db/db.service.js';
import { adminLogs, users } from '../db/schema.js';
import { AdminListLogsDto } from './dto/moderation.dto.js';

function escapeLikePrefix(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type AuditTarget =
  | 'user'
  | 'post'
  | 'comment'
  | 'match'
  | 'league'
  | 'inquiry'
  | 'message'
  | 'report'
  | 'settings'
  | 'word';

@Injectable()
export class AuditService {
  constructor(private readonly dbService: DbService) {}

  /** 관리자 조치를 기록한다. action 예: 'user.block', 'post.hide', 'match.update' */
  async log(
    admin: AuthUser,
    action: string,
    targetType: AuditTarget,
    targetId: number | null,
    detail = '',
  ) {
    await this.dbService.db.insert(adminLogs).values({
      adminId: admin.id,
      action,
      targetType,
      targetId,
      detail: detail.slice(0, 300),
    });
  }

  async list(query: AdminListLogsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(adminLogs.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.action) {
      conditions.push(like(adminLogs.action, `${escapeLikePrefix(query.action)}%`));
    }
    if (query.adminId) conditions.push(eq(adminLogs.adminId, query.adminId));
    if (query.targetType) conditions.push(eq(adminLogs.targetType, query.targetType));
    if (query.targetId) conditions.push(eq(adminLogs.targetId, query.targetId));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(adminLogs.action, pattern),
          ilike(adminLogs.detail, pattern),
          ilike(adminLogs.targetType, pattern),
          ilike(users.nickname, pattern),
          ilike(users.username, pattern),
          id ? eq(adminLogs.targetId, id) : undefined,
        ]);
      }),
    );
    const where = and(...conditions);
    const db = this.dbService.db;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: adminLogs.id,
          adminId: users.id,
          adminNickname: users.nickname,
          action: adminLogs.action,
          targetType: adminLogs.targetType,
          targetId: adminLogs.targetId,
          detail: adminLogs.detail,
          createdAt: adminLogs.createdAt,
        })
        .from(adminLogs)
        .leftJoin(users, eq(adminLogs.adminId, users.id))
        .where(where)
        .orderBy(desc(adminLogs.createdAt), desc(adminLogs.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(adminLogs)
        .leftJoin(users, eq(adminLogs.adminId, users.id))
        .where(where),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        admin:
          row.adminId == null || row.adminNickname == null
            ? null
            : { id: row.adminId, nickname: row.adminNickname },
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        detail: row.detail,
        createdAt: row.createdAt,
      })),
      total,
      page,
      pageSize,
      filter: rangeMeta(range),
    };
  }
}
