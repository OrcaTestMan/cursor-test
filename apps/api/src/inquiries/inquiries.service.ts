import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { adminInquiryColumns, inquiryColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { inquiries, users } from '../db/schema.js';
import {
  AdminListInquiriesDto,
  AnswerInquiryDto,
  CreateInquiryDto,
} from './dto/inquiry.dto.js';

const NOT_FOUND = '문의를 찾을 수 없습니다.';

@Injectable()
export class InquiriesService {
  constructor(private readonly dbService: DbService) {}

  async listMine(user: AuthUser, query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
    const where = eq(inquiries.userId, user.id);
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
    return { items, total, page, pageSize };
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
    const where = query.status ? eq(inquiries.status, query.status) : undefined;
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminInquiryColumns)
        .from(inquiries)
        .innerJoin(users, eq(inquiries.userId, users.id))
        .where(where)
        .orderBy(
          sql`case when ${inquiries.status} = 'waiting' then 0 else 1 end`,
          desc(inquiries.createdAt),
          desc(inquiries.id),
        )
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(inquiries).where(where),
    ]);
    return { items, total, page, pageSize };
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

  async answer(id: number, dto: AnswerInquiryDto) {
    const [updated] = await this.dbService.db
      .update(inquiries)
      .set({ answer: dto.answer, status: 'answered', answeredAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning({ id: inquiries.id });
    if (!updated) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.getAdmin(id);
  }
}
