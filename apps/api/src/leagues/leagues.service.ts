import { ConflictException, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { leagues } from '../db/schema.js';
import { CreateLeagueDto } from './dto/create-league.dto.js';

@Injectable()
export class LeaguesService {
  constructor(private readonly dbService: DbService) {}

  list() {
    return this.dbService.db.select().from(leagues).orderBy(asc(leagues.name));
  }

  async create(dto: CreateLeagueDto) {
    const [existing] = await this.dbService.db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.name, dto.name));
    if (existing) {
      throw new ConflictException('이미 등록된 리그입니다.');
    }

    const [league] = await this.dbService.db
      .insert(leagues)
      .values(dto)
      .returning();
    return league;
  }
}
