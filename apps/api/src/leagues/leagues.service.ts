import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { leagueColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { leagues, matches } from '../db/schema.js';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto.js';

@Injectable()
export class LeaguesService {
  constructor(private readonly dbService: DbService) {}

  list() {
    return this.dbService.db
      .select(leagueColumns)
      .from(leagues)
      .orderBy(asc(leagues.name));
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
