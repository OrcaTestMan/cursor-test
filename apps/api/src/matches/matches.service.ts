import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, lt, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { leagues, matches } from '../db/schema.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { ListMatchesDto } from './dto/list-matches.dto.js';
import { UpdateMatchDto } from './dto/update-match.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MatchesService {
  constructor(private readonly dbService: DbService) {}

  private selectWithLeague() {
    return this.dbService.db
      .select({
        id: matches.id,
        leagueId: matches.leagueId,
        leagueName: leagues.name,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        kickoffAt: matches.kickoffAt,
        venue: matches.venue,
        status: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .innerJoin(leagues, eq(matches.leagueId, leagues.id));
  }

  list(query: ListMatchesDto) {
    const conditions: SQL[] = [];
    if (query.date) {
      const start = new Date(`${query.date}T00:00:00+09:00`);
      conditions.push(gte(matches.kickoffAt, start));
      conditions.push(lt(matches.kickoffAt, new Date(start.getTime() + DAY_MS)));
    }
    if (query.leagueId) {
      conditions.push(eq(matches.leagueId, query.leagueId));
    }

    return this.selectWithLeague()
      .where(and(...conditions))
      .orderBy(asc(matches.kickoffAt));
  }

  async get(id: number) {
    const [match] = await this.selectWithLeague().where(eq(matches.id, id));
    if (!match) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }
    return match;
  }

  async create(dto: CreateMatchDto) {
    const [league] = await this.dbService.db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.id, dto.leagueId));
    if (!league) {
      throw new NotFoundException('리그를 찾을 수 없습니다.');
    }

    const [match] = await this.dbService.db
      .insert(matches)
      .values({
        leagueId: dto.leagueId,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        kickoffAt: new Date(dto.kickoffAt),
        venue: dto.venue,
      })
      .returning({ id: matches.id });
    return this.get(match.id);
  }

  async update(id: number, dto: UpdateMatchDto) {
    const [updated] = await this.dbService.db
      .update(matches)
      .set({
        status: dto.status,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, id))
      .returning({ id: matches.id });
    if (!updated) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }
    return this.get(id);
  }
}
