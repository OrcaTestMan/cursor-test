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
    // 서버 DB는 서버 루프백만. 이 PC에서 원격 5432로 붙는 것을 거부한다.
    if (/211\.110\.16\.130/.test(url)) {
      throw new Error(
        'Refusing DATABASE_URL to 211.110.16.130 (server DB is local-only)',
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
