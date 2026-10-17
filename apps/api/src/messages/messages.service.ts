import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, isNull, ne } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { DbService } from '../db/db.service.js';
import { messages, messageSends, users } from '../db/schema.js';
import { SendMessageDto } from './dto/message.dto.js';

const NOT_FOUND = '쪽지를 찾을 수 없습니다.';

const messageColumns = {
  id: messages.id,
  title: messageSends.title,
  body: messageSends.body,
  readAt: messages.readAt,
  createdAt: messages.createdAt,
};

@Injectable()
export class MessagesService {
  constructor(private readonly dbService: DbService) {}

  private inbox(user: AuthUser) {
    return and(eq(messages.userId, user.id), isNull(messages.deletedAt));
  }

  async listMine(user: AuthUser, query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
    const where = this.inbox(user);
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
      db.select({ total: count() }).from(messages).where(where),
      db
        .select({ unreadCount: count() })
        .from(messages)
        .where(and(where, isNull(messages.readAt))),
    ]);
    return { items, total, page, pageSize, unreadCount };
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

    return db.transaction(async (tx) => {
      const [send] = await tx
        .insert(messageSends)
        .values({
          title: dto.title,
          body: dto.body,
          toAll,
          toUserId: toAll ? null : recipientIds[0],
        })
        .returning({ id: messageSends.id });
      if (recipientIds.length > 0) {
        await tx
          .insert(messages)
          .values(recipientIds.map((userId) => ({ sendId: send.id, userId })));
      }
      return { sent: recipientIds.length };
    });
  }

  async listSent(query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
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
        .orderBy(desc(messageSends.createdAt), desc(messageSends.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(messageSends),
    ]);
    return { items, total, page, pageSize };
  }
}
