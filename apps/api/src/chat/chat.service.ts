import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, lt, notInArray } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { authorColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { matchMessages, teams, userTeams, users } from '../db/schema.js';
import { MatchesService } from '../matches/matches.service.js';
import { SocialService } from '../social/social.service.js';

const NOT_FOUND = '메시지를 찾을 수 없습니다.';
const MAX_BODY = 500;
const COOLDOWN_MS = 2000;
const PAGE = 50;

export type ChatMessageView = {
  id: number;
  matchId: number;
  body: string;
  status: 'visible' | 'hidden';
  deleted: boolean;
  createdAt: Date;
  author: { id: number; nickname: string; avatarUploadId: number | null };
  teamName: string | null;
};

@Injectable()
export class ChatService {
  private lastSend = new Map<number, number>();

  constructor(
    private readonly dbService: DbService,
    private readonly matchesService: MatchesService,
    private readonly socialService: SocialService,
  ) {}

  async list(matchId: number, viewer: AuthUser | undefined, beforeId?: number) {
    await this.matchesService.get(matchId);
    const conditions = [eq(matchMessages.matchId, matchId)];
    if (beforeId) conditions.push(lt(matchMessages.id, beforeId));
    if (viewer?.role !== 'admin') {
      conditions.push(eq(matchMessages.status, 'visible'));
    }
    if (viewer) {
      const mutedIds = await this.socialService.mutedIds(viewer.id);
      if (mutedIds.length > 0) {
        conditions.push(notInArray(matchMessages.userId, mutedIds));
      }
    }
    const rows = await this.dbService.db
      .select({
        id: matchMessages.id,
        matchId: matchMessages.matchId,
        body: matchMessages.body,
        status: matchMessages.status,
        deletedAt: matchMessages.deletedAt,
        createdAt: matchMessages.createdAt,
        author: authorColumns,
      })
      .from(matchMessages)
      .innerJoin(users, eq(matchMessages.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(matchMessages.id))
      .limit(PAGE);
    const items = await this.withTeams(rows.map((row) => this.toView(row, viewer)));
    return { items: items.reverse(), pageSize: PAGE };
  }

  async create(matchId: number, user: AuthUser, body: string) {
    await this.matchesService.get(matchId);
    const text = body.trim();
    if (!text) throw new BadRequestException('내용을 입력해 주세요.');
    if (text.length > MAX_BODY) {
      throw new BadRequestException(`메시지는 ${MAX_BODY}자까지 쓸 수 있습니다.`);
    }
    const last = this.lastSend.get(user.id) ?? 0;
    if (Date.now() - last < COOLDOWN_MS) {
      throw new BadRequestException('메시지를 너무 자주 보냈습니다. 잠시 뒤 다시 보내 주세요.');
    }
    const [row] = await this.dbService.db
      .insert(matchMessages)
      .values({ matchId, userId: user.id, body: text })
      .returning({ id: matchMessages.id });
    this.lastSend.set(user.id, Date.now());
    return this.get(row.id, user);
  }

  async remove(id: number, user: AuthUser) {
    const [row] = await this.dbService.db
      .select({
        id: matchMessages.id,
        matchId: matchMessages.matchId,
        userId: matchMessages.userId,
        deletedAt: matchMessages.deletedAt,
      })
      .from(matchMessages)
      .where(eq(matchMessages.id, id));
    if (!row || row.deletedAt) throw new NotFoundException(NOT_FOUND);
    if (row.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('본인 메시지만 지울 수 있습니다.');
    }
    await this.dbService.db
      .update(matchMessages)
      .set({ deletedAt: new Date() })
      .where(eq(matchMessages.id, id));
    return { id, matchId: row.matchId, deleted: true };
  }

  async get(id: number, viewer?: AuthUser) {
    const [row] = await this.dbService.db
      .select({
        id: matchMessages.id,
        matchId: matchMessages.matchId,
        body: matchMessages.body,
        status: matchMessages.status,
        deletedAt: matchMessages.deletedAt,
        createdAt: matchMessages.createdAt,
        author: authorColumns,
      })
      .from(matchMessages)
      .innerJoin(users, eq(matchMessages.userId, users.id))
      .where(eq(matchMessages.id, id));
    if (!row) throw new NotFoundException(NOT_FOUND);
    if (row.status !== 'visible' && viewer?.role !== 'admin') {
      throw new NotFoundException(NOT_FOUND);
    }
    const [view] = await this.withTeams([this.toView(row, viewer)]);
    return view;
  }

  async listAfter(matchId: number, afterId: number, viewer?: AuthUser) {
    const { items } = await this.list(matchId, viewer);
    return items.filter((item) => item.id > afterId);
  }

  private toView(
    row: {
      id: number;
      matchId: number;
      body: string;
      status: 'pending' | 'visible' | 'hidden';
      deletedAt: Date | null;
      createdAt: Date;
      author: ChatMessageView['author'];
    },
    viewer: AuthUser | undefined,
  ): ChatMessageView {
    const deleted = row.deletedAt !== null;
    const hidden = row.status !== 'visible' && viewer?.role !== 'admin';
    return {
      id: row.id,
      matchId: row.matchId,
      body: deleted || hidden ? '' : row.body,
      status: row.status === 'hidden' ? 'hidden' : 'visible',
      deleted,
      createdAt: row.createdAt,
      author: row.author,
      teamName: null,
    };
  }

  private async withTeams(items: ChatMessageView[]) {
    if (items.length === 0) return items;
    const userIds = [...new Set(items.map((item) => item.author.id))];
    const rows = await this.dbService.db
      .select({ userId: userTeams.userId, name: teams.name })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(and(inArray(userTeams.userId, userIds), eq(userTeams.isPrimary, true)));
    const primary = new Map(rows.map((row) => [row.userId, row.name]));
    return items.map((item) => ({ ...item, teamName: primary.get(item.author.id) ?? null }));
  }
}
