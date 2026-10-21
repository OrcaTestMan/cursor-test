import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { migrateOnBoot } from './db/migrate-on-boot.js';
import { serveWeb } from './security/web-static.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  await migrateOnBoot();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }
  setupApp(app);
  const webDir = serveWeb(app);
  if (webDir) {
    new Logger('Web').log(`화면 파일을 함께 제공합니다: ${webDir}`);
  }
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
