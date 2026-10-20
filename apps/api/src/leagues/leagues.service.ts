import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, exists, ilike, ne, sql, type SQL } from 'drizzle-orm';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { leagueColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { leagues, matches } from '../db/schema.js';
import { AdminListLeaguesDto, CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto.js';

@Injectable()
export class LeaguesService {
  constructor(private readonly dbService: DbService) {}

  list() {
    return this.dbService.db
      .select(leagueColumns)
      .from(leagues)
      .orderBy(asc(leagues.name));
  }

  async listAdmin(query: AdminListLeaguesDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(leagues.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.sport) conditions.push(eq(leagues.sport, query.sport));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([ilike(leagues.name, pattern), ilike(leagues.sport, pattern)]);
      }),
    );
    const matchExists = exists(
      this.dbService.db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.leagueId, leagues.id)),
    );
    if (query.hasMatches === true) conditions.push(matchExists);
    if (query.hasMatches === false) conditions.push(sql`not ${matchExists}`);
    if (query.minMatchCount !== undefined) {
      conditions.push(
        sql`(select count(*)::int from "matches" where "matches"."league_id" = "leagues"."id") >= ${query.minMatchCount}`,
      );
    }
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(leagueColumns)
        .from(leagues)
        .where(where)
        .orderBy(asc(leagues.name), asc(leagues.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(leagues).where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async get(id: number) {
    const [league] = await this.dbService.db
      .select(leagueColumns)
      .from(leagues)
      .where(eq(leagues.id, id));
    if (!league) {
      throw new NotFoundException('리그를 찾을 수 없습니다.');
    }
    return league;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const [existing] = await this.dbService.db
      .select({ id: leagues.id })
      .from(leagues)
      .where(
        exceptId
          ? and(eq(leagues.name, name), ne(leagues.id, exceptId))
          : eq(leagues.name, name),
      );
    if (existing) {
      throw new ConflictException('이미 등록된 리그 이름입니다.');
    }
  }

  async create(dto: CreateLeagueDto) {
    await this.assertNameFree(dto.name);
    const [league] = await this.dbService.db
      .insert(leagues)
      .values({ name: dto.name, sport: dto.sport })
      .onConflictDoNothing()
      .returning({ id: leagues.id });
    if (!league) {
      throw new ConflictException('이미 등록된 리그 이름입니다.');
    }
    return this.get(league.id);
  }

  async update(id: number, dto: UpdateLeagueDto) {
    await this.get(id);
    if (dto.name !== undefined) {
      await this.assertNameFree(dto.name, id);
    }
    if (dto.name !== undefined || dto.sport !== undefined) {
      await this.dbService.db
        .update(leagues)
        .set({ name: dto.name, sport: dto.sport })
        .where(eq(leagues.id, id));
    }
    return this.get(id);
  }

  async remove(id: number) {
    await this.get(id);
    const [match] = await this.dbService.db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.leagueId, id))
      .limit(1);
    if (match) {
      throw new ConflictException('경기가 등록된 리그는 지울 수 없습니다.');
    }
    await this.dbService.db.delete(leagues).where(eq(leagues.id, id));
  }
}
