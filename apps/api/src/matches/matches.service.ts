import { Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import { matchColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { leagues, matches, teams } from '../db/schema.js';
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

  /**
   * 공개 목록은 기간이 없으면 오늘(KST). 위젯·전체 일정은 호출 측에서 range=all 을 넘겨야 한다.
   */
  private async matchConditions(query: ListMatchesDto, requireActiveTeam: boolean) {
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(matches.kickoffAt, range);
    if (bounded) conditions.push(bounded);
    if (query.leagueId) conditions.push(eq(matches.leagueId, query.leagueId));
    if (query.status) conditions.push(eq(matches.status, query.status));
    if (query.sport) conditions.push(eq(leagues.sport, query.sport));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(matches.homeTeam, pattern),
          ilike(matches.awayTeam, pattern),
          ilike(leagues.name, pattern),
          ilike(leagues.sport, pattern),
          ilike(matches.venue, pattern),
          id ? eq(matches.id, id) : undefined,
        ]);
      }),
    );
    if (query.teamId) {
      const [team] = await this.dbService.db
        .select({ name: teams.name, active: teams.active, sport: teams.sport })
        .from(teams)
        .where(eq(teams.id, query.teamId));
      if (!team || (requireActiveTeam && !team.active)) {
        return { range, conditions: null as SQL[] | null };
      }
      if (query.sport && team.sport !== query.sport) {
        return { range, conditions: null as SQL[] | null };
      }
      if (query.side === 'home') {
        conditions.push(eq(matches.homeTeam, team.name));
      } else if (query.side === 'away') {
        conditions.push(eq(matches.awayTeam, team.name));
      } else {
        conditions.push(
          or(eq(matches.homeTeam, team.name), eq(matches.awayTeam, team.name))!,
        );
      }
    }
    const kickoffHour = sql`extract(hour from timezone('Asia/Seoul', ${matches.kickoffAt}))`;
    if (query.hourFrom !== undefined) {
      conditions.push(sql`${kickoffHour} >= ${query.hourFrom}`);
    }
    if (query.hourTo !== undefined) {
      conditions.push(sql`${kickoffHour} <= ${query.hourTo}`);
    }
    if (query.hasScore === true) {
      conditions.push(isNotNull(matches.homeScore), isNotNull(matches.awayScore));
    }
    if (query.hasScore === false) {
      conditions.push(or(isNull(matches.homeScore), isNull(matches.awayScore))!);
    }
    if (query.missingScore === true) {
      conditions.push(
        eq(matches.status, 'finished'),
        or(isNull(matches.homeScore), isNull(matches.awayScore))!,
      );
    }
    return { range, conditions };
  }

  async list(query: ListMatchesDto) {
    const { conditions } = await this.matchConditions(query, true);
    if (!conditions) return [];
    return this.select()
      .where(and(...conditions))
      .orderBy(asc(matches.kickoffAt), asc(matches.id));
  }

  async listAdmin(query: AdminListMatchesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const { range, conditions } = await this.matchConditions(query, false);
    if (!conditions) {
      return { items: [], total: 0, page, pageSize, filter: rangeMeta(range) };
    }
    const where = and(...conditions);
    const sort = query.sort ?? 'kickoff_desc';
    const order =
      sort === 'kickoff_asc'
        ? [asc(matches.kickoffAt), asc(matches.id)]
        : [desc(matches.kickoffAt), desc(matches.id)];

    const [items, [{ total }]] = await Promise.all([
      this.select()
        .where(where)
        .orderBy(...order)
        .limit(pageSize)
        .offset(offset),
      this.dbService.db
        .select({ total: count() })
        .from(matches)
        .innerJoin(leagues, eq(matches.leagueId, leagues.id))
        .where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
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
