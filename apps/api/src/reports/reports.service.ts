import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, exists, ilike, max, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import type {
  ContentStatus,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import {
  comments,
  matchMessages,
  posts,
  reports,
  sessions,
  users,
} from '../db/schema.js';
import { AuditService } from '../moderation/audit.service.js';
import {
  NotificationsService,
  quoteTitle,
} from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  AdminListReportsDto,
  ReportAction,
  ResolveReportDto,
} from './dto/report.dto.js';
import { CreateReportDto } from './dto/report.dto.js';

const NOT_FOUND_TARGET = '신고 대상을 찾을 수 없습니다.';
const NOT_FOUND_GROUP = '처리할 신고가 없습니다.';
const OWN_TARGET = '내 글은 신고할 수 없습니다.';
const DUPLICATE = '이미 신고하셨습니다.';
const DAY_MS = 24 * 60 * 60 * 1000;
const EXCERPT_MAX = 80;

type TargetInfo = {
  postId: number;
  title: string;
  excerpt: string;
  author: { id: number; nickname: string };
  authorRole: AuthUser['role'];
  authorStatus: AuthUser['status'];
  status: ContentStatus;
  deleted: boolean;
};

function excerptOf(text: string) {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > EXCERPT_MAX ? `${one.slice(0, EXCERPT_MAX)}…` : one;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(user: AuthUser, dto: CreateReportDto) {
    const target = await this.loadTarget(dto.targetType, dto.targetId);
    if (!target) {
      throw new NotFoundException(NOT_FOUND_TARGET);
    }
    if (target.author.id === user.id) {
      throw new BadRequestException(OWN_TARGET);
    }

    const [created] = await this.dbService.db
      .insert(reports)
      .values({
        reporterId: user.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        detail: dto.detail ?? '',
      })
      .onConflictDoNothing()
      .returning({ id: reports.id });
    if (!created) {
      throw new ConflictException(DUPLICATE);
    }

    const config = await this.settingsService.getModeration();
    const threshold = config?.reportHideThreshold ?? 5;
    const [{ pending }] = await this.dbService.db
      .select({ pending: count() })
      .from(reports)
      .where(
        and(
          eq(reports.targetType, dto.targetType),
          eq(reports.targetId, dto.targetId),
          eq(reports.status, 'pending'),
        ),
      );
    if (pending >= threshold && target.status !== 'hidden') {
      await this.setTargetStatus(dto.targetType, dto.targetId, 'hidden');
    }
    return { id: created.id };
  }

  async listAdmin(query: AdminListReportsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const status = query.status ?? 'pending';
    const range = resolveDateRange(query);
    const conditions: SQL[] = [eq(reports.status, status)];
    const bounded = dateCondition(reports.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.targetType) {
      conditions.push(eq(reports.targetType, query.targetType));
    }
    if (query.reason) {
      conditions.push(eq(reports.reason, query.reason));
    }
    const tokens = searchTokens(query.q);
    const db = this.dbService.db;
    conditions.push(
      ...andTokens(tokens, (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(reports.detail, pattern),
          ilike(users.nickname, pattern),
          ilike(users.username, pattern),
          id ? eq(reports.id, id) : undefined,
          id ? eq(reports.targetId, id) : undefined,
          exists(
            db
              .select({ id: posts.id })
              .from(posts)
              .innerJoin(users, eq(posts.authorId, users.id))
              .where(
                and(
                  eq(reports.targetType, 'post'),
                  eq(reports.targetId, posts.id),
                  anyField([
                    ilike(posts.title, pattern),
                    ilike(posts.body, pattern),
                    ilike(users.nickname, pattern),
                  ]),
                ),
              ),
          ),
          exists(
            db
              .select({ id: comments.id })
              .from(comments)
              .innerJoin(users, eq(comments.authorId, users.id))
              .where(
                and(
                  eq(reports.targetType, 'comment'),
                  eq(reports.targetId, comments.id),
                  anyField([
                    ilike(comments.body, pattern),
                    ilike(users.nickname, pattern),
                  ]),
                ),
              ),
          ),
          exists(
            db
              .select({ id: matchMessages.id })
              .from(matchMessages)
              .innerJoin(users, eq(matchMessages.userId, users.id))
              .where(
                and(
                  eq(reports.targetType, 'chat'),
                  eq(reports.targetId, matchMessages.id),
                  anyField([
                    ilike(matchMessages.body, pattern),
                    ilike(users.nickname, pattern),
                  ]),
                ),
              ),
          ),
        ]);
      }),
    );
    const where = and(...conditions);
    const havingParts: SQL[] = [];
    if (query.minCount !== undefined) {
      havingParts.push(sql`count(*) >= ${query.minCount}`);
    }
    if (query.pendingHours && status === 'pending') {
      const cutoff = new Date(Date.now() - query.pendingHours * 60 * 60 * 1000);
      havingParts.push(sql`max(${reports.createdAt}) <= ${cutoff}`);
    }
    const having = havingParts.length > 0 ? and(...havingParts) : undefined;
    const sort = query.sort ?? 'latest';
    const order =
      sort === 'pending_old'
        ? [sql`max(${reports.createdAt}) asc`, desc(reports.targetId)]
        : sort === 'count'
          ? [sql`count(*) desc`, sql`max(${reports.createdAt}) desc`, desc(reports.targetId)]
          : [sql`max(${reports.createdAt}) desc`, desc(reports.targetId)];

    const grouped = db
      .select({
        targetType: reports.targetType,
        targetId: reports.targetId,
        reportCount: count(),
        latestAt: max(reports.createdAt),
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(where)
      .groupBy(reports.targetType, reports.targetId);
    const groupedFiltered = having ? grouped.having(having) : grouped;
    const countBase = db
      .select({
        targetType: reports.targetType,
        targetId: reports.targetId,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(where)
      .groupBy(reports.targetType, reports.targetId);
    const countSub = (having ? countBase.having(having) : countBase).as(
      'report_groups',
    );

    const [groupRows, [{ total }]] = await Promise.all([
      groupedFiltered
        .orderBy(...order)
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(countSub),
    ]);

    const items = await Promise.all(
      groupRows.map((row) =>
        this.buildGroup(row.targetType, row.targetId, status, {
          reportCount: Number(row.reportCount),
          latestAt: row.latestAt ?? new Date(),
        }),
      ),
    );
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async resolve(admin: AuthUser, dto: ResolveReportDto) {
    const pending = await this.pendingReports(dto.targetType, dto.targetId);
    if (pending.length === 0) {
      throw new NotFoundException(NOT_FOUND_GROUP);
    }
    const target = await this.loadTarget(dto.targetType, dto.targetId);
    const nextStatus: ReportStatus =
      dto.action === 'dismiss' ? 'rejected' : 'resolved';
    const now = new Date();
    const note = dto.note ?? null;

    await this.dbService.db.transaction(async (tx) => {
      await tx
        .update(reports)
        .set({
          status: nextStatus,
          handledById: admin.id,
          handledAt: now,
          handleNote: note,
        })
        .where(
          and(
            eq(reports.targetType, dto.targetType),
            eq(reports.targetId, dto.targetId),
            eq(reports.status, 'pending'),
          ),
        );
      await this.applyAction(tx, dto.action, dto.targetType, dto.targetId, target);
      if (dto.blockDays !== undefined && target) {
        await this.blockAuthor(tx, admin, target, dto.blockDays, note);
      }
    });

    const title = target?.title || '(삭제됨)';
    const postId = target?.postId ?? (dto.targetType === 'post' ? dto.targetId : 0);
    await this.notificationsService.notifyMany(
      pending.map((row) => row.reporterId),
      'report_result',
      quoteTitle(title, '에 대한 신고가 처리되었습니다.'),
      postId > 0 ? `/posts/${postId}` : '/posts',
      admin.id,
    );
    await this.auditService.log(
      admin,
      `report.${dto.action}`,
      'report',
      dto.targetId,
      `${dto.targetType}:${dto.targetId}${note ? ` · ${note}` : ''}`,
    );
    return this.buildGroup(dto.targetType, dto.targetId, nextStatus);
  }

  private pendingReports(targetType: ReportTarget, targetId: number) {
    return this.dbService.db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
      })
      .from(reports)
      .where(
        and(
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          eq(reports.status, 'pending'),
        ),
      );
  }

  private async buildGroup(
    targetType: ReportTarget,
    targetId: number,
    status: ReportStatus,
    preset?: { reportCount: number; latestAt: Date },
  ) {
    const rows = await this.dbService.db
      .select({
        reason: reports.reason,
        detail: reports.detail,
        createdAt: reports.createdAt,
        handledById: reports.handledById,
        handledAt: reports.handledAt,
        handleNote: reports.handleNote,
        handlerId: users.id,
        handlerNickname: users.nickname,
      })
      .from(reports)
      .leftJoin(users, eq(reports.handledById, users.id))
      .where(
        and(
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          eq(reports.status, status),
        ),
      )
      .orderBy(desc(reports.createdAt), desc(reports.id));

    const reasons: Partial<Record<ReportReason, number>> = {};
    const details: string[] = [];
    for (const row of rows) {
      reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
      if (row.detail) {
        details.push(row.detail);
      }
    }
    const latest = rows[0];
    const target = (await this.loadTarget(targetType, targetId)) ?? {
      postId: targetType === 'post' ? targetId : 0,
      title: '(삭제됨)',
      excerpt: '',
      author: { id: 0, nickname: '(알 수 없음)' },
      authorRole: 'user' as const,
      authorStatus: 'deleted' as const,
      status: 'hidden' as const,
      deleted: true,
    };

    return {
      targetType,
      targetId,
      status,
      reportCount: preset?.reportCount ?? rows.length,
      reasons,
      details,
      latestAt: preset?.latestAt ?? latest?.createdAt ?? new Date(),
      target: {
        postId: target.postId,
        title: target.title,
        excerpt: target.excerpt,
        author: target.author,
        status: target.status,
        deleted: target.deleted,
      },
      handledBy:
        latest?.handlerId != null && latest.handlerNickname != null
          ? { id: latest.handlerId, nickname: latest.handlerNickname }
          : null,
      handledAt: latest?.handledAt ?? null,
      handleNote: latest?.handleNote ?? null,
    };
  }

  private async loadTarget(
    targetType: ReportTarget,
    targetId: number,
  ): Promise<TargetInfo | null> {
    if (targetType === 'chat') {
      const [row] = await this.dbService.db
        .select({
          id: matchMessages.id,
          body: matchMessages.body,
          status: matchMessages.status,
          deletedAt: matchMessages.deletedAt,
          matchId: matchMessages.matchId,
          authorId: users.id,
          nickname: users.nickname,
          authorRole: users.role,
          authorStatus: users.status,
        })
        .from(matchMessages)
        .innerJoin(users, eq(matchMessages.userId, users.id))
        .where(eq(matchMessages.id, targetId));
      if (!row) return null;
      return {
        postId: row.matchId,
        title: `경기 응원방 #${row.matchId}`,
        excerpt: excerptOf(row.body),
        author: { id: row.authorId, nickname: row.nickname },
        authorRole: row.authorRole,
        authorStatus: row.authorStatus,
        status: row.status,
        deleted: row.deletedAt !== null,
      };
    }
    if (targetType === 'post') {
      const [row] = await this.dbService.db
        .select({
          id: posts.id,
          title: posts.title,
          body: posts.body,
          status: posts.status,
          authorId: users.id,
          nickname: users.nickname,
          authorRole: users.role,
          authorStatus: users.status,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.id, targetId));
      if (!row) {
        return null;
      }
      return {
        postId: row.id,
        title: row.title,
        excerpt: excerptOf(row.body),
        author: { id: row.authorId, nickname: row.nickname },
        authorRole: row.authorRole,
        authorStatus: row.authorStatus,
        status: row.status,
        deleted: false,
      };
    }

    const [row] = await this.dbService.db
      .select({
        id: comments.id,
        body: comments.body,
        status: comments.status,
        deletedAt: comments.deletedAt,
        postId: posts.id,
        title: posts.title,
        authorId: users.id,
        nickname: users.nickname,
        authorRole: users.role,
        authorStatus: users.status,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(eq(comments.id, targetId));
    if (!row) {
      return null;
    }
    return {
      postId: row.postId,
      title: row.title,
      excerpt: excerptOf(row.body),
      author: { id: row.authorId, nickname: row.nickname },
      authorRole: row.authorRole,
      authorStatus: row.authorStatus,
      status: row.status,
      deleted: row.deletedAt !== null,
    };
  }

  private async setTargetStatus(
    targetType: ReportTarget,
    targetId: number,
    status: ContentStatus,
  ) {
    if (targetType === 'chat') {
      await this.dbService.db
        .update(matchMessages)
        .set({ status })
        .where(eq(matchMessages.id, targetId));
      return;
    }
    if (targetType === 'post') {
      await this.dbService.db
        .update(posts)
        .set({ status, updatedAt: new Date() })
        .where(eq(posts.id, targetId));
      return;
    }
    await this.dbService.db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, targetId));
  }

  private async applyAction(
    tx: Parameters<Parameters<DbService['db']['transaction']>[0]>[0],
    action: ReportAction,
    targetType: ReportTarget,
    targetId: number,
    target: TargetInfo | null,
  ) {
    if (action === 'dismiss') {
      if (target && target.status === 'hidden' && !target.deleted) {
        if (targetType === 'chat') {
          await tx
            .update(matchMessages)
            .set({ status: 'visible' })
            .where(eq(matchMessages.id, targetId));
        } else if (targetType === 'post') {
          await tx
            .update(posts)
            .set({ status: 'visible', updatedAt: new Date() })
            .where(eq(posts.id, targetId));
        } else {
          await tx
            .update(comments)
            .set({ status: 'visible' })
            .where(eq(comments.id, targetId));
        }
      }
      return;
    }
    if (action === 'hide') {
      if (targetType === 'chat') {
        await tx
          .update(matchMessages)
          .set({ status: 'hidden' })
          .where(eq(matchMessages.id, targetId));
      } else if (targetType === 'post') {
        await tx
          .update(posts)
          .set({ status: 'hidden', updatedAt: new Date() })
          .where(eq(posts.id, targetId));
      } else {
        await tx
          .update(comments)
          .set({ status: 'hidden' })
          .where(eq(comments.id, targetId));
      }
      return;
    }
    if (targetType === 'chat') {
      await tx
        .update(matchMessages)
        .set({ deletedAt: new Date(), status: 'hidden' })
        .where(eq(matchMessages.id, targetId));
      return;
    }
    if (targetType === 'post') {
      await tx.delete(posts).where(eq(posts.id, targetId));
      return;
    }
    await tx
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(eq(comments.id, targetId));
  }

  private async blockAuthor(
    tx: Parameters<Parameters<DbService['db']['transaction']>[0]>[0],
    admin: AuthUser,
    target: TargetInfo,
    blockDays: number,
    note: string | null,
  ) {
    if (
      target.author.id === admin.id ||
      target.authorRole === 'admin' ||
      target.authorStatus === 'deleted'
    ) {
      return;
    }
    const blockedUntil = blockDays
      ? new Date(Date.now() + blockDays * DAY_MS)
      : null;
    await tx
      .update(users)
      .set({
        status: 'blocked',
        blockedUntil,
        blockedAt: new Date(),
        blockedReason: (note || '신고 처리').slice(0, 200),
      })
      .where(eq(users.id, target.author.id));
    await tx.delete(sessions).where(eq(sessions.userId, target.author.id));
    await this.auditService.log(
      admin,
      'user.block',
      'user',
      target.author.id,
      `${target.author.nickname} 기간: ${blockDays ? `${blockDays}일` : '영구'}`,
    );
  }
}
