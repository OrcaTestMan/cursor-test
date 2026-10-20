import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import { adminInquiryColumns, inquiryColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { inquiries, users } from '../db/schema.js';
import { AuditService } from '../moderation/audit.service.js';
import {
  NotificationsService,
  quoteTitle,
} from '../notifications/notifications.service.js';
import {
  AdminListInquiriesDto,
  AnswerInquiryDto,
  CreateInquiryDto,
  ListMineInquiriesDto,
} from './dto/inquiry.dto.js';

const NOT_FOUND = '문의를 찾을 수 없습니다.';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly dbService: DbService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listMine(user: AuthUser, query: ListMineInquiriesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [eq(inquiries.userId, user.id)];
    const bounded = dateCondition(inquiries.createdAt, range);
    if (bounded) conditions.push(bounded);
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(inquiries.title, pattern),
          ilike(inquiries.body, pattern),
          ilike(inquiries.answer, pattern),
          id ? eq(inquiries.id, id) : undefined,
        ]);
      }),
    );
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(inquiryColumns)
        .from(inquiries)
        .where(where)
        .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(inquiries).where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async create(user: AuthUser, dto: CreateInquiryDto) {
    const [inquiry] = await this.dbService.db
      .insert(inquiries)
      .values({ userId: user.id, title: dto.title, body: dto.body })
      .returning(inquiryColumns);
    return inquiry;
  }

  async getMine(user: AuthUser, id: number) {
    const [inquiry] = await this.dbService.db
      .select(inquiryColumns)
      .from(inquiries)
      .where(and(eq(inquiries.id, id), eq(inquiries.userId, user.id)));
    if (!inquiry) {
      throw new NotFoundException(NOT_FOUND);
    }
    return inquiry;
  }

  async listAdmin(query: AdminListInquiriesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const dateField = query.dateField === 'answered' ? 'answered' : 'created';
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(inquiries.status, query.status));
    if (query.userId) conditions.push(eq(inquiries.userId, query.userId));
    if (query.id) conditions.push(eq(inquiries.id, query.id));
    const dateCol = dateField === 'answered' ? inquiries.answeredAt : inquiries.createdAt;
    const bounded = dateCondition(dateCol, range);
    if (bounded) {
      conditions.push(bounded);
      if (dateField === 'answered') conditions.push(isNotNull(inquiries.answeredAt));
    }
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(inquiries.title, pattern),
          ilike(inquiries.body, pattern),
          ilike(inquiries.answer, pattern),
          ilike(users.nickname, pattern),
          ilike(users.username, pattern),
          id ? eq(inquiries.id, id) : undefined,
        ]);
      }),
    );
    if (query.waitingHours) {
      const cutoff = new Date(Date.now() - query.waitingHours * 60 * 60 * 1000);
      conditions.push(eq(inquiries.status, 'waiting'), sql`${inquiries.createdAt} <= ${cutoff}`);
    }
    const where = and(...conditions);
    const sort = query.sort;
    const order =
      sort === 'created_asc'
        ? [asc(inquiries.createdAt), asc(inquiries.id)]
        : sort === 'answered_desc'
          ? [sql`${inquiries.answeredAt} desc nulls last`, desc(inquiries.id)]
          : sort === 'waiting_old'
            ? [
                sql`case when ${inquiries.status} = 'waiting' then 0 else 1 end`,
                asc(inquiries.createdAt),
                asc(inquiries.id),
              ]
            : sort === 'created_desc'
              ? [desc(inquiries.createdAt), desc(inquiries.id)]
              : [
                  sql`case when ${inquiries.status} = 'waiting' then 0 else 1 end`,
                  desc(inquiries.createdAt),
                  desc(inquiries.id),
                ];
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminInquiryColumns)
        .from(inquiries)
        .innerJoin(users, eq(inquiries.userId, users.id))
        .where(where)
        .orderBy(...order)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(inquiries)
        .innerJoin(users, eq(inquiries.userId, users.id))
        .where(where),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      filter: { ...rangeMeta(range), dateField },
    };
  }

  recent(limit: number) {
    return this.dbService.db
      .select(adminInquiryColumns)
      .from(inquiries)
      .innerJoin(users, eq(inquiries.userId, users.id))
      .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
      .limit(limit);
  }

  async getAdmin(id: number) {
    const [inquiry] = await this.dbService.db
      .select(adminInquiryColumns)
      .from(inquiries)
      .innerJoin(users, eq(inquiries.userId, users.id))
      .where(eq(inquiries.id, id));
    if (!inquiry) {
      throw new NotFoundException(NOT_FOUND);
    }
    return inquiry;
  }

  async answer(id: number, admin: AuthUser, dto: AnswerInquiryDto) {
    const [updated] = await this.dbService.db
      .update(inquiries)
      .set({ answer: dto.answer, status: 'answered', answeredAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning({ id: inquiries.id, userId: inquiries.userId, title: inquiries.title });
    if (!updated) {
      throw new NotFoundException(NOT_FOUND);
    }
    await this.auditService.log(admin, 'inquiry.answer', 'inquiry', id, updated.title);
    await this.notificationsService.notify(
      updated.userId,
      'inquiry_answer',
      quoteTitle(updated.title, ' 문의에 답변이 등록되었습니다.'),
      `/inquiries/${id}`,
      admin.id,
    );
    return this.getAdmin(id);
  }
}
