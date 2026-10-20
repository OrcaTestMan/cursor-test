import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly client: ReturnType<typeof postgres>;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }
    // 야간/로컬 안전장치: 원격 서버 DB는 명시적 허용 없으면 거부
    if (
      /211\.110\.16\.130/.test(url) &&
      process.env.ALLOW_REMOTE_DB !== '1'
    ) {
      throw new Error(
        'Refusing DATABASE_URL to 211.110.16.130 (set ALLOW_REMOTE_DB=1 only for approved ops)',
      );
    }

    const max = Number(process.env.DATABASE_POOL_MAX || 10);
    this.client = postgres(url, {
      max: Number.isFinite(max) && max > 0 ? max : 10,
    });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
