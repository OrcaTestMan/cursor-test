import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from './db/db.service.js';

@Injectable()
export class AppService {
  constructor(private readonly dbService: DbService) {}

  async health() {
    await this.dbService.db.execute(sql`SELECT 1`);
    return { status: 'ok' as const, db: 'up' as const };
  }
}
