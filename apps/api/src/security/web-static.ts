import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

function findWebDist(): string | null {
  const candidates = process.env.WEB_DIST
    ? [resolve(process.env.WEB_DIST)]
    : [
        fileURLToPath(new URL('../../../web/dist', import.meta.url)),
        resolve(process.cwd(), '../web/dist'),
        resolve(process.cwd(), 'apps/web/dist'),
      ];
  return (
    candidates.find((dir) => existsSync(join(dir, 'index.html'))) ?? null
  );
}

function isApiPath(path: string) {
  return path === '/api' || path.startsWith('/api/');
}

/** 빌드된 화면이 있으면 함께 제공한다. `/api`가 아닌 GET 요청 중 파일이 없으면 index.html을 준다. */
export function serveWeb(app: NestExpressApplication): string | null {
  const dir = findWebDist();
  if (!dir) {
    return null;
  }
  const indexHtml = join(dir, 'index.html');
  app.useStaticAssets(dir, { index: false });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isApiPath(req.path)) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });
  return dir;
}
