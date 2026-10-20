import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, exists, ilike, isNotNull, isNull, ne, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { DbService } from '../db/db.service.js';
import { messages, messageSends, users } from '../db/schema.js';
import { AuditService } from '../moderation/audit.service.js';
import {
  NotificationsService,
  quoteTitle,
} from '../notifications/notifications.service.js';
import {
  AdminListMessagesDto,
  ListMineMessagesDto,
  SendMessageDto,
} from './dto/message.dto.js';

const NOT_FOUND = '쪽지를 찾을 수 없습니다.';
const INSERT_CHUNK = 1000;

const messageColumns = {
  id: messages.id,
  title: messageSends.title,
  body: messageSends.body,
  readAt: messages.readAt,
  createdAt: messages.createdAt,
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly dbService: DbService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private inbox(user: AuthUser) {
    return and(eq(messages.userId, user.id), isNull(messages.deletedAt));
  }

  async listMine(user: AuthUser, query: ListMineMessagesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [this.inbox(user)!];
    const bounded = dateCondition(messages.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.unread === true) conditions.push(isNull(messages.readAt));
    if (query.unread === false) conditions.push(isNotNull(messages.readAt));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([
          ilike(messageSends.title, pattern),
          ilike(messageSends.body, pattern),
        ]);
      }),
    );
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }], [{ unreadCount }]] = await Promise.all([
      db
        .select(messageColumns)
        .from(messages)
        .innerJoin(messageSends, eq(messages.sendId, messageSends.id))
        .where(where)
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(messages)
        .innerJoin(messageSends, eq(messages.sendId, messageSends.id))
        .where(where),
      db
        .select({ unreadCount: count() })
        .from(messages)
        .where(and(this.inbox(user), isNull(messages.readAt))),
    ]);
    return { items, total, page, pageSize, unreadCount, filter: rangeMeta(range) };
  }

  private async getMine(user: AuthUser, id: number) {
    const [message] = await this.dbService.db
      .select(messageColumns)
      .from(messages)
      .innerJoin(messageSends, eq(messages.sendId, messageSends.id))
      .where(and(eq(messages.id, id), this.inbox(user)));
    if (!message) {
      throw new NotFoundException(NOT_FOUND);
    }
    return message;
  }

  async markRead(user: AuthUser, id: number) {
    const message = await this.getMine(user, id);
    if (message.readAt) {
      return message;
    }
    await this.dbService.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.id, id), isNull(messages.readAt)));
    return this.getMine(user, id);
  }

  async remove(user: AuthUser, id: number) {
    const [deleted] = await this.dbService.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(and(eq(messages.id, id), this.inbox(user)))
      .returning({ id: messages.id });
    if (!deleted) {
      throw new NotFoundException(NOT_FOUND);
    }
  }

  async send(sender: AuthUser, dto: SendMessageDto) {
    const db = this.dbService.db;
    const toAll = dto.toAll === true;
    if (!toAll && !dto.toUserId) {
      throw new BadRequestException(
        '받는 회원을 고르거나 전체 발송을 선택해 주세요.',
      );
    }

    let recipientIds: number[];
    if (toAll) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.status, 'active'), ne(users.id, sender.id)));
      recipientIds = rows.map((row) => row.id);
    } else {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, dto.toUserId ?? 0));
      if (!user) {
        throw new NotFoundException('회원을 찾을 수 없습니다.');
      }
      recipientIds = [user.id];
    }

    const sendId = await db.transaction(async (tx) => {
      const [send] = await tx
        .insert(messageSends)
        .values({
          title: dto.title,
          body: dto.body,
          toAll,
          toUserId: toAll ? null : recipientIds[0],
        })
        .returning({ id: messageSends.id });
      for (let i = 0; i < recipientIds.length; i += INSERT_CHUNK) {
        await tx.insert(messages).values(
          recipientIds
            .slice(i, i + INSERT_CHUNK)
            .map((userId) => ({ sendId: send.id, userId })),
        );
      }
      return send.id;
    });

    await this.auditService.log(
      sender,
      'message.send',
      'message',
      sendId,
      `${toAll ? '전체' : `회원 ${recipientIds[0]}`} · ${recipientIds.length}명 · ${dto.title}`,
    );
    await this.notificationsService.notifyMany(
      recipientIds,
      'message',
      quoteTitle(dto.title, ' 쪽지가 도착했습니다.'),
      '/messages',
      sender.id,
    );
    return { sent: recipientIds.length };
  }

  async listSent(query: AdminListMessagesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(messageSends.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.toAll === true) conditions.push(eq(messageSends.toAll, true));
    if (query.toAll === false) conditions.push(eq(messageSends.toAll, false));
    if (query.toUserId) conditions.push(eq(messageSends.toUserId, query.toUserId));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([
          ilike(messageSends.title, pattern),
          ilike(messageSends.body, pattern),
          ilike(users.nickname, pattern),
          ilike(users.username, pattern),
        ]);
      }),
    );
    if (query.unreadOnly === true) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ id: messages.id })
            .from(messages)
            .where(
              and(
                eq(messages.sendId, messageSends.id),
                isNull(messages.readAt),
                isNull(messages.deletedAt),
              ),
            ),
        ),
      );
    }
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: messageSends.id,
          title: messageSends.title,
          body: messageSends.body,
          toAll: messageSends.toAll,
          to: { id: users.id, nickname: users.nickname },
          createdAt: messageSends.createdAt,
        })
        .from(messageSends)
        .leftJoin(users, eq(messageSends.toUserId, users.id))
        .where(where)
        .orderBy(desc(messageSends.createdAt), desc(messageSends.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(messageSends)
        .leftJoin(users, eq(messageSends.toUserId, users.id))
        .where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }
}
