import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, lt, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { notificationColumns, type NotificationType } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import {
  notificationSettings,
  notifications,
  posts,
  userMutes,
} from '../db/schema.js';
import type { ListNotificationsDto } from './dto/notification.dto.js';
import type { UpdateNotificationSettingsDto } from '../social/dto/social.dto.js';

const NOT_FOUND = '알림을 찾을 수 없습니다.';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const TEXT_MAX = 200;
const INSERT_CHUNK = 1000;

const SOCIAL_TYPES = new Set<NotificationType>([
  'comment',
  'reply',
  'mention',
  'subscribe',
  'follow',
]);

const DEFAULT_SETTINGS = {
  comment: true,
  reply: true,
  mention: true,
  subscribe: true,
  follow: true,
  inquiry_answer: true,
  message: true,
  report_result: true,
} as const;

const SETTING_COLUMN: Record<
  NotificationType,
  | 'comment'
  | 'reply'
  | 'mention'
  | 'subscribe'
  | 'follow'
  | 'inquiryAnswer'
  | 'message'
  | 'reportResult'
> = {
  comment: 'comment',
  reply: 'reply',
  mention: 'mention',
  subscribe: 'subscribe',
  follow: 'follow',
  inquiry_answer: 'inquiryAnswer',
  message: 'message',
  report_result: 'reportResult',
};

/** `“제목”` + rest 가 200자를 넘지 않도록 제목을 줄인다. */
export function quoteTitle(title: string, rest: string) {
  const room = TEXT_MAX - rest.length - 2;
  const quoted =
    title.length > room ? `${title.slice(0, Math.max(room - 1, 0))}…` : title;
  return `“${quoted}”${rest}`;
}

function parsePostId(link: string): number | null {
  const match = /^\/posts\/(\d+)/.exec(link);
  return match ? Number(match[1]) : null;
}

function toSettingsView(row: typeof notificationSettings.$inferSelect | undefined) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    comment: row.comment,
    reply: row.reply,
    mention: row.mention,
    subscribe: row.subscribe,
    follow: row.follow,
    inquiry_answer: row.inquiryAnswer,
    message: row.message,
    report_result: row.reportResult,
  };
}

@Injectable()
export class NotificationsService {
  constructor(private readonly dbService: DbService) {}

  private async allowedIds(
    userIds: number[],
    type: NotificationType,
    actorId?: number,
  ) {
    const unique = [...new Set(userIds)].filter((id) => id !== actorId);
    if (unique.length === 0) return [];
    const db = this.dbService.db;
    const [muteRows, settingRows] = await Promise.all([
      actorId && SOCIAL_TYPES.has(type)
        ? db
            .select({ userId: userMutes.userId })
            .from(userMutes)
            .where(
              and(
                eq(userMutes.mutedUserId, actorId),
                inArray(userMutes.userId, unique),
              ),
            )
        : Promise.resolve([] as { userId: number }[]),
      db
        .select()
        .from(notificationSettings)
        .where(inArray(notificationSettings.userId, unique)),
    ]);
    const muted = new Set(muteRows.map((row) => row.userId));
    const settings = new Map(settingRows.map((row) => [row.userId, row]));
    const column = SETTING_COLUMN[type];
    return unique.filter((id) => {
      if (muted.has(id)) return false;
      const row = settings.get(id);
      return row ? row[column] : true;
    });
  }

  /** 알림을 만든다. 받는 사람이 행동한 사람 자신이면 만들지 않는다. */
  async notify(
    userId: number,
    type: NotificationType,
    text: string,
    link: string,
    actorId?: number,
  ) {
    const [allowed] = await this.allowedIds([userId], type, actorId);
    if (allowed === undefined) return;
    await this.dbService.db.insert(notifications).values({
      userId: allowed,
      type,
      text: text.slice(0, TEXT_MAX),
      link: link.slice(0, TEXT_MAX),
    });
  }

  async notifyMany(
    userIds: number[],
    type: NotificationType,
    text: string,
    link: string,
    actorId?: number,
  ) {
    const targets = await this.allowedIds(userIds, type, actorId);
    for (let i = 0; i < targets.length; i += INSERT_CHUNK) {
      await this.dbService.db.insert(notifications).values(
        targets.slice(i, i + INSERT_CHUNK).map((userId) => ({
          userId,
          type,
          text: text.slice(0, TEXT_MAX),
          link: link.slice(0, TEXT_MAX),
        })),
      );
    }
  }

  async getSettings(user: AuthUser) {
    const [row] = await this.dbService.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, user.id));
    return toSettingsView(row);
  }

  async updateSettings(user: AuthUser, dto: UpdateNotificationSettingsDto) {
    const patch: Partial<typeof notificationSettings.$inferInsert> = {
      userId: user.id,
    };
    if (dto.comment !== undefined) patch.comment = dto.comment;
    if (dto.reply !== undefined) patch.reply = dto.reply;
    if (dto.mention !== undefined) patch.mention = dto.mention;
    if (dto.subscribe !== undefined) patch.subscribe = dto.subscribe;
    if (dto.follow !== undefined) patch.follow = dto.follow;
    if (dto.inquiry_answer !== undefined) patch.inquiryAnswer = dto.inquiry_answer;
    if (dto.message !== undefined) patch.message = dto.message;
    if (dto.report_result !== undefined) patch.reportResult = dto.report_result;

    const keys = Object.keys(patch).filter((key) => key !== 'userId');
    if (keys.length === 0) {
      return this.getSettings(user);
    }
    await this.dbService.db
      .insert(notificationSettings)
      .values(patch as typeof notificationSettings.$inferInsert)
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: Object.fromEntries(
          keys.map((key) => [
            key,
            patch[key as keyof typeof patch],
          ]),
        ),
      });
    return this.getSettings(user);
  }

  async listMine(user: AuthUser, query: ListNotificationsDto) {
    const db = this.dbService.db;
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          lt(notifications.createdAt, new Date(Date.now() - KEEP_MS)),
        ),
      );

    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [eq(notifications.userId, user.id)];
    const bounded = dateCondition(notifications.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.unread === true) conditions.push(isNull(notifications.readAt));
    if (query.unread === false) conditions.push(isNotNull(notifications.readAt));
    if (query.type) conditions.push(eq(notifications.type, query.type));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([
          ilike(notifications.text, pattern),
          ilike(notifications.link, pattern),
        ]);
      }),
    );
    const where = and(...conditions);
    const [rows, [{ total }], [{ unreadCount }]] = await Promise.all([
      db
        .select(notificationColumns)
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(notifications).where(where),
      db
        .select({ unreadCount: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    ]);

    const postIds = [
      ...new Set(
        rows
          .map((item) => parsePostId(item.link))
          .filter((id): id is number => id !== null),
      ),
    ];
    const visible = new Set<number>();
    if (postIds.length > 0) {
      const found = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(inArray(posts.id, postIds), eq(posts.status, 'visible')));
      for (const row of found) visible.add(row.id);
    }

    const items = rows.map((item) => {
      const postId = parsePostId(item.link);
      return {
        ...item,
        available: postId === null || visible.has(postId),
      };
    });
    return { items, total, page, pageSize, unreadCount, filter: rangeMeta(range) };
  }

  async markRead(user: AuthUser, id: number) {
    const mine = and(eq(notifications.id, id), eq(notifications.userId, user.id));
    await this.dbService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(mine, isNull(notifications.readAt)));
    const [row] = await this.dbService.db
      .select(notificationColumns)
      .from(notifications)
      .where(mine);
    if (!row) {
      throw new NotFoundException(NOT_FOUND);
    }
    const postId = parsePostId(row.link);
    let available = true;
    if (postId !== null) {
      const [post] = await this.dbService.db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.status, 'visible')));
      available = !!post;
    }
    return { ...row, available };
  }

  async markAllRead(user: AuthUser) {
    await this.dbService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  }
}
