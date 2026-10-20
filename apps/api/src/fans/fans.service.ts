import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, or, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { searchTokens } from '../common/search-query.js';
import { leagueColumns, matchColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import {
  leagues,
  matchCheers,
  matches,
  matchPredictions,
  teams,
  users,
} from '../db/schema.js';
import type {
  CheerDto,
  PredictionDto,
  PredictionPick,
  RankingQueryDto,
  StandingsQueryDto,
} from './dto/fan.dto.js';

const MATCH_NOT_FOUND = '경기를 찾을 수 없습니다.';
const LEAGUE_NOT_FOUND = '리그를 찾을 수 없습니다.';
const CHEER_CLOSED = '경기가 시작되어 바꿀 수 없습니다.';
const PREDICTION_CLOSED = '경기가 시작되어 예측할 수 없습니다.';

type StandingAcc = {
  team: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
};

function isOpen(kickoffAt: Date, status: string) {
  return kickoffAt.getTime() > Date.now() && status === 'scheduled';
}

function actualPick(
  homeScore: number,
  awayScore: number,
): PredictionPick {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

@Injectable()
export class FansService {
  constructor(private readonly dbService: DbService) {}

  private matchSelect() {
    return this.dbService.db
      .select(matchColumns)
      .from(matches)
      .innerJoin(leagues, eq(matches.leagueId, leagues.id));
  }

  async getDetail(id: number, user?: AuthUser) {
    const [match] = await this.matchSelect().where(eq(matches.id, id));
    if (!match) {
      throw new NotFoundException(MATCH_NOT_FOUND);
    }

    const [cheerRows, predictionRows, myCheerRow, myPickRow] = await Promise.all([
      this.dbService.db
        .select({ side: matchCheers.side, total: count() })
        .from(matchCheers)
        .where(eq(matchCheers.matchId, id))
        .groupBy(matchCheers.side),
      this.dbService.db
        .select({ pick: matchPredictions.pick, total: count() })
        .from(matchPredictions)
        .where(eq(matchPredictions.matchId, id))
        .groupBy(matchPredictions.pick),
      user
        ? this.dbService.db
            .select({ side: matchCheers.side })
            .from(matchCheers)
            .where(
              and(eq(matchCheers.matchId, id), eq(matchCheers.userId, user.id)),
            )
        : Promise.resolve([] as { side: 'home' | 'away' }[]),
      user
        ? this.dbService.db
            .select({ pick: matchPredictions.pick })
            .from(matchPredictions)
            .where(
              and(
                eq(matchPredictions.matchId, id),
                eq(matchPredictions.userId, user.id),
              ),
            )
        : Promise.resolve([] as { pick: PredictionPick }[]),
    ]);

    const cheers = { home: 0, away: 0 };
    for (const row of cheerRows) {
      cheers[row.side] = Number(row.total);
    }
    const prediction = { home: 0, draw: 0, away: 0 };
    for (const row of predictionRows) {
      prediction[row.pick] = Number(row.total);
    }

    return {
      ...match,
      cheers,
      myCheer: myCheerRow[0]?.side ?? null,
      prediction,
      myPick: myPickRow[0]?.pick ?? null,
      open: isOpen(match.kickoffAt, match.status),
    };
  }

  async setCheer(id: number, user: AuthUser, dto: CheerDto) {
    const detail = await this.getDetail(id, user);
    if (!detail.open) {
      throw new BadRequestException(CHEER_CLOSED);
    }
    await this.dbService.db
      .insert(matchCheers)
      .values({ matchId: id, userId: user.id, side: dto.side })
      .onConflictDoUpdate({
        target: [matchCheers.matchId, matchCheers.userId],
        set: { side: dto.side },
      });
    return this.getDetail(id, user);
  }

  async removeCheer(id: number, user: AuthUser) {
    await this.getDetail(id, user);
    await this.dbService.db
      .delete(matchCheers)
      .where(and(eq(matchCheers.matchId, id), eq(matchCheers.userId, user.id)));
    return this.getDetail(id, user);
  }

  async setPrediction(id: number, user: AuthUser, dto: PredictionDto) {
    const detail = await this.getDetail(id, user);
    if (!detail.open) {
      throw new BadRequestException(PREDICTION_CLOSED);
    }
    await this.dbService.db
      .insert(matchPredictions)
      .values({
        matchId: id,
        userId: user.id,
        pick: dto.pick,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [matchPredictions.matchId, matchPredictions.userId],
        set: { pick: dto.pick, updatedAt: new Date() },
      });
    return this.getDetail(id, user);
  }

  async listMyPredictions(user: AuthUser, query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
    const where = eq(matchPredictions.userId, user.id);
    const db = this.dbService.db;

    const [rows, allRows] = await Promise.all([
      db
        .select({
          match: matchColumns,
          pick: matchPredictions.pick,
        })
        .from(matchPredictions)
        .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
        .innerJoin(leagues, eq(matches.leagueId, leagues.id))
        .where(where)
        .orderBy(desc(matches.kickoffAt), desc(matches.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          pick: matchPredictions.pick,
          status: matches.status,
          homeScore: matches.homeScore,
          awayScore: matches.awayScore,
        })
        .from(matchPredictions)
        .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
        .where(where),
    ]);

    let decided = 0;
    let hits = 0;
    for (const row of allRows) {
      if (
        row.status !== 'finished' ||
        row.homeScore == null ||
        row.awayScore == null
      ) {
        continue;
      }
      decided += 1;
      if (row.pick === actualPick(row.homeScore, row.awayScore)) {
        hits += 1;
      }
    }

    const items = rows.map((row) => {
      const finished =
        row.match.status === 'finished' &&
        row.match.homeScore != null &&
        row.match.awayScore != null;
      const result = finished
        ? row.pick ===
          actualPick(row.match.homeScore ?? 0, row.match.awayScore ?? 0)
          ? ('hit' as const)
          : ('miss' as const)
        : ('pending' as const);
      return { match: row.match, pick: row.pick, result };
    });

    return {
      items,
      total: allRows.length,
      page,
      pageSize,
      summary: {
        total: allRows.length,
        decided,
        hits,
        rate: decided === 0 ? 0 : Math.round((hits / decided) * 1000) / 1000,
      },
    };
  }

  async standings(leagueId: number, query: StandingsQueryDto = {}) {
    const [league] = await this.dbService.db
      .select(leagueColumns)
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      throw new NotFoundException(LEAGUE_NOT_FOUND);
    }

    const range = resolveDateRange({
      range: query.range ?? (query.from || query.to ? query.range : 'all'),
      from: query.from,
      to: query.to,
    });
    const conditions: SQL[] = [
      eq(matches.leagueId, leagueId),
      eq(matches.status, 'finished'),
    ];
    const bounded = dateCondition(matches.kickoffAt, range);
    if (bounded) conditions.push(bounded);

    const finished = await this.dbService.db
      .select({
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(and(...conditions));

    const stats = new Map<string, StandingAcc>();
    const team = (name: string) => {
      const current = stats.get(name);
      if (current) return current;
      const created: StandingAcc = {
        team: name,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };
      stats.set(name, created);
      return created;
    };

    for (const match of finished) {
      if (match.homeScore == null || match.awayScore == null) continue;
      const home = team(match.homeTeam);
      const away = team(match.awayTeam);
      home.played += 1;
      away.played += 1;
      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;
      if (match.homeScore > match.awayScore) {
        home.win += 1;
        away.loss += 1;
      } else if (match.homeScore < match.awayScore) {
        away.win += 1;
        home.loss += 1;
      } else {
        home.draw += 1;
        away.draw += 1;
      }
    }

    const mode = league.sport === '야구' ? 'winRate' : 'points';
    const rows = [...stats.values()]
      .map((row) => {
        const decided = row.win + row.loss;
        return {
          rank: 0,
          team: row.team,
          played: row.played,
          win: row.win,
          draw: row.draw,
          loss: row.loss,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          diff: row.goalsFor - row.goalsAgainst,
          points: row.win * 3 + row.draw,
          winRate: decided === 0 ? 0 : Math.round((row.win / decided) * 1000) / 1000,
        };
      })
      .sort((a, b) => {
        if (mode === 'winRate') {
          return b.winRate - a.winRate || b.win - a.win || a.team.localeCompare(b.team, 'ko');
        }
        return (
          b.points - a.points ||
          b.diff - a.diff ||
          b.goalsFor - a.goalsFor ||
          a.team.localeCompare(b.team, 'ko')
        );
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return { league, mode, rows, filter: rangeMeta(range) };
  }

  async summaryForUser(userId: number) {
    const rows = await this.dbService.db
      .select({
        pick: matchPredictions.pick,
        status: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matchPredictions)
      .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
      .where(eq(matchPredictions.userId, userId));

    let decided = 0;
    let hits = 0;
    for (const row of rows) {
      if (
        row.status !== 'finished' ||
        row.homeScore == null ||
        row.awayScore == null
      ) {
        continue;
      }
      decided += 1;
      if (row.pick === actualPick(row.homeScore, row.awayScore)) {
        hits += 1;
      }
    }
    return {
      total: rows.length,
      decided,
      hits,
      rate: decided === 0 ? 0 : Math.round((hits / decided) * 1000) / 1000,
    };
  }

  async ranking(query: RankingQueryDto = {}) {
    const range = resolveDateRange({
      range: query.range ?? (query.from || query.to ? query.range : 'all'),
      from: query.from,
      to: query.to,
    });
    const conditions: SQL[] = [eq(users.status, 'active')];
    const bounded = dateCondition(matches.kickoffAt, range);
    if (bounded) conditions.push(bounded);
    if (query.sport) conditions.push(eq(leagues.sport, query.sport));
    if (query.leagueId) conditions.push(eq(matches.leagueId, query.leagueId));
    if (query.teamId) {
      const [team] = await this.dbService.db
        .select({ name: teams.name, sport: teams.sport })
        .from(teams)
        .where(eq(teams.id, query.teamId));
      if (!team || (query.sport && team.sport !== query.sport)) {
        return { items: [], filter: rangeMeta(range) };
      }
      conditions.push(
        or(eq(matches.homeTeam, team.name), eq(matches.awayTeam, team.name))!,
      );
    }

    const rows = await this.dbService.db
      .select({
        userId: matchPredictions.userId,
        nickname: users.nickname,
        pick: matchPredictions.pick,
        status: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matchPredictions)
      .innerJoin(users, eq(matchPredictions.userId, users.id))
      .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
      .innerJoin(leagues, eq(matches.leagueId, leagues.id))
      .where(and(...conditions));

    const byUser = new Map<
      number,
      { user: { id: number; nickname: string }; total: number; decided: number; hits: number }
    >();
    for (const row of rows) {
      let acc = byUser.get(row.userId);
      if (!acc) {
        acc = {
          user: { id: row.userId, nickname: row.nickname },
          total: 0,
          decided: 0,
          hits: 0,
        };
        byUser.set(row.userId, acc);
      }
      acc.total += 1;
      if (
        row.status !== 'finished' ||
        row.homeScore == null ||
        row.awayScore == null
      ) {
        continue;
      }
      acc.decided += 1;
      if (row.pick === actualPick(row.homeScore, row.awayScore)) {
        acc.hits += 1;
      }
    }

    const minDecided = query.minDecided ?? 1;
    const ranked = [...byUser.values()]
      .filter((row) => row.decided >= minDecided)
      .map((row) => ({
        ...row,
        rate: Math.round((row.hits / row.decided) * 1000) / 1000,
      }))
      .sort(
        (a, b) =>
          b.rate - a.rate ||
          b.hits - a.hits ||
          b.decided - a.decided ||
          a.user.nickname.localeCompare(b.user.nickname, 'ko'),
      )
      .map((row, index) => ({ rank: index + 1, ...row }));
    const tokens = searchTokens(query.q).map((token) => token.toLowerCase());
    const items =
      tokens.length === 0
        ? ranked
        : ranked.filter((row) =>
            tokens.every((token) => row.user.nickname.toLowerCase().includes(token)),
          );

    return { items, filter: rangeMeta(range) };
  }
}
