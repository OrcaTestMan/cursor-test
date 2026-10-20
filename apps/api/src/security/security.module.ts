import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

export const TOO_MANY_REQUESTS_MESSAGE =
  '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.';

export const MINUTE_MS = 60 * 1000;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: MINUTE_MS, limit: 300 }],
      errorMessage: TOO_MANY_REQUESTS_MESSAGE,
      skipIf: () => process.env.NODE_ENV !== 'production',
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class SecurityModule {}
