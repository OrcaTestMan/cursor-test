import { Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  or,
  type SQL,
} from 'drizzle-orm';
import { addDays, kstDayRange, kstDayStart } from '../common/kst.js';
import { pageParams } from '../common/pagination.js';
import { likePattern } from '../common/text.js';
import { matchColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { leagues, matches } from '../db/schema.js';
import {
  AdminListMatchesDto,
  CreateMatchDto,
  ListMatchesDto,
  UpdateMatchDto,
} from './dto/match.dto.js';

function normalizeVenue(venue: string | null | undefined) {
  if (venue === undefined) {
    return undefined;
  }
  return venue === null || venue === '' ? null : venue;
}

@Injectable()
export class MatchesService {
  constructor(private readonly dbService: DbService) {}

  private select() {
    return this.dbService.db
      .select(matchColumns)
      .from(matches)
      .innerJoin(leagues, eq(matches.leagueId, leagues.id));
  }

  list(query: ListMatchesDto) {
    const conditions: SQL[] = [];
    if (query.date) {
      const { start, end } = kstDayRange(query.date);
      conditions.push(gte(matches.kickoffAt, start), lt(matches.kickoffAt, end));
    }
    if (query.leagueId) {
      conditions.push(eq(matches.leagueId, query.leagueId));
    }
    if (query.status) {
      conditions.push(eq(matches.status, query.status));
    }
    return this.select()
      .where(and(...conditions))
      .orderBy(asc(matches.kickoffAt), asc(matches.id));
  }

  async listAdmin(query: AdminListMatchesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const conditions: SQL[] = [];
    if (query.from) {
      conditions.push(gte(matches.kickoffAt, kstDayStart(query.from)));
    }
    if (query.to) {
      conditions.push(
        lt(matches.kickoffAt, kstDayStart(addDays(query.to, 1))),
      );
    }
    if (query.leagueId) {
      conditions.push(eq(matches.leagueId, query.leagueId));
    }
    if (query.status) {
      conditions.push(eq(matches.status, query.status));
    }
    if (query.q) {
      const pattern = likePattern(query.q);
      const teamMatch = or(
        ilike(matches.homeTeam, pattern),
        ilike(matches.awayTeam, pattern),
      );
      if (teamMatch) {
        conditions.push(teamMatch);
      }
    }
    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      this.select()
        .where(where)
        .orderBy(desc(matches.kickoffAt), desc(matches.id))
        .limit(pageSize)
        .offset(offset),
      this.dbService.db.select({ total: count() }).from(matches).where(where),
    ]);
    return { items, total, page, pageSize };
  }

  async findById(id: number) {
    const [match] = await this.select().where(eq(matches.id, id));
    return match ?? null;
  }

  async get(id: number) {
    const match = await this.findById(id);
    if (!match) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }
    return match;
  }

  private async assertLeague(leagueId: number) {
    const [league] = await this.dbService.db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      throw new NotFoundException('리그를 찾을 수 없습니다.');
    }
  }

  async create(dto: CreateMatchDto) {
    await this.assertLeague(dto.leagueId);
    const [match] = await this.dbService.db
      .insert(matches)
      .values({
        leagueId: dto.leagueId,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        kickoffAt: new Date(dto.kickoffAt),
        venue: normalizeVenue(dto.venue),
      })
      .returning({ id: matches.id });
    return this.get(match.id);
  }

  async update(id: number, dto: UpdateMatchDto) {
    await this.get(id);
    if (dto.leagueId !== undefined) {
      await this.assertLeague(dto.leagueId);
    }
    await this.dbService.db
      .update(matches)
      .set({
        leagueId: dto.leagueId,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        kickoffAt:
          dto.kickoffAt === undefined ? undefined : new Date(dto.kickoffAt),
        venue: normalizeVenue(dto.venue),
        status: dto.status,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, id));
    return this.get(id);
  }

  async remove(id: number) {
    const [deleted] = await this.dbService.db
      .delete(matches)
      .where(eq(matches.id, id))
      .returning({ id: matches.id });
    if (!deleted) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }
  }
}
