import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { DbService } from '../db/db.service.js';
import { leagues, matches, teams, userTeams } from '../db/schema.js';
import type { AdminListTeamsDto, CreateTeamDto, UpdateTeamDto } from './dto/team.dto.js';

const MAX_USER_TEAMS = 10;

export type TeamView = {
  id: number;
  name: string;
  sport: string;
  leagueId: number | null;
  active: boolean;
};

@Injectable()
export class TeamsService {
  constructor(private readonly dbService: DbService) {}

  list(activeOnly = true) {
    const db = this.dbService.db;
    const query = db
      .select({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        leagueId: teams.leagueId,
        active: teams.active,
      })
      .from(teams)
      .orderBy(asc(teams.sport), asc(teams.name), asc(teams.id));
    if (activeOnly) {
      return query.where(eq(teams.active, true));
    }
    return query;
  }

  async get(id: number): Promise<TeamView> {
    const [row] = await this.dbService.db
      .select({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        leagueId: teams.leagueId,
        active: teams.active,
      })
      .from(teams)
      .where(eq(teams.id, id));
    if (!row || !row.active) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }
    return row;
  }

  async listForUser(userId: number) {
    return this.dbService.db
      .select({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        leagueId: teams.leagueId,
        active: teams.active,
        isPrimary: userTeams.isPrimary,
      })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(and(eq(userTeams.userId, userId), eq(teams.active, true)))
      .orderBy(desc(userTeams.isPrimary), asc(teams.name));
  }

  async setForUser(
    user: AuthUser,
    teamIds: number[],
    primaryTeamId: number | null,
  ) {
    const unique = [...new Set(teamIds)];
    if (unique.length > MAX_USER_TEAMS) {
      throw new BadRequestException(`응원팀은 ${MAX_USER_TEAMS}개까지 고를 수 있습니다.`);
    }
    if (unique.length === 0) {
      await this.dbService.db
        .delete(userTeams)
        .where(eq(userTeams.userId, user.id));
      return this.listForUser(user.id);
    }
    const rows = await this.dbService.db
      .select({ id: teams.id, active: teams.active })
      .from(teams)
      .where(inArray(teams.id, unique));
    if (rows.length !== unique.length || rows.some((row) => !row.active)) {
      throw new BadRequestException('팀 번호가 올바르지 않습니다.');
    }
    const primary =
      primaryTeamId && unique.includes(primaryTeamId)
        ? primaryTeamId
        : unique[0];
    await this.dbService.db.transaction(async (tx) => {
      await tx.delete(userTeams).where(eq(userTeams.userId, user.id));
      await tx.insert(userTeams).values(
        unique.map((teamId) => ({
          userId: user.id,
          teamId,
          isPrimary: teamId === primary,
        })),
      );
    });
    return this.listForUser(user.id);
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const [row] = await this.dbService.db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.name, name));
    if (row && row.id !== exceptId) {
      throw new BadRequestException(
        '같은 이름 팀이 있습니다. 비슷한 이름은 합치지 않고 그대로 둡니다.',
      );
    }
  }

  private async assertLeague(leagueId: number | null | undefined) {
    if (!leagueId) return;
    const [row] = await this.dbService.db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!row) throw new BadRequestException('리그 번호가 올바르지 않습니다.');
  }

  async getAdmin(id: number) {
    const [row] = await this.dbService.db
      .select({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        leagueId: teams.leagueId,
        active: teams.active,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .where(eq(teams.id, id));
    if (!row) throw new NotFoundException('팀을 찾을 수 없습니다.');
    return row;
  }

  async listAdmin(query: AdminListTeamsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(teams.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.sport) conditions.push(eq(teams.sport, query.sport));
    if (query.leagueId) conditions.push(eq(teams.leagueId, query.leagueId));
    if (query.active === true) conditions.push(eq(teams.active, true));
    if (query.active === false) conditions.push(eq(teams.active, false));
    if (query.unlinked === true) conditions.push(isNull(teams.leagueId));
    if (query.unlinked === false) conditions.push(isNotNull(teams.leagueId));
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([ilike(teams.name, pattern), ilike(teams.sport, pattern)]);
      }),
    );
    const matchExists = exists(
      this.dbService.db
        .select({ id: matches.id })
        .from(matches)
        .where(or(eq(matches.homeTeam, teams.name), eq(matches.awayTeam, teams.name))),
    );
    if (query.hasMatches === true) conditions.push(matchExists);
    if (query.hasMatches === false) conditions.push(sql`not ${matchExists}`);
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: teams.id,
          name: teams.name,
          sport: teams.sport,
          leagueId: teams.leagueId,
          active: teams.active,
          createdAt: teams.createdAt,
        })
        .from(teams)
        .where(where)
        .orderBy(asc(teams.sport), asc(teams.name), asc(teams.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(teams).where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async create(dto: CreateTeamDto) {
    await this.assertNameFree(dto.name);
    await this.assertLeague(dto.leagueId ?? null);
    const [row] = await this.dbService.db
      .insert(teams)
      .values({
        name: dto.name,
        sport: dto.sport,
        leagueId: dto.leagueId ?? null,
      })
      .returning({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        leagueId: teams.leagueId,
        active: teams.active,
      });
    return row;
  }

  async update(id: number, dto: UpdateTeamDto) {
    await this.getAdmin(id);
    if (dto.name) await this.assertNameFree(dto.name, id);
    if (dto.leagueId !== undefined) await this.assertLeague(dto.leagueId);
    await this.dbService.db
      .update(teams)
      .set({
        name: dto.name,
        sport: dto.sport,
        leagueId: dto.leagueId,
        active: dto.active,
      })
      .where(eq(teams.id, id));
    return this.getAdmin(id);
  }
}
