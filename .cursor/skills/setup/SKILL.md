---
name: setup
description: Scaffolds this repo's TypeScript workspace with Vite React, NestJS, PostgreSQL, and Drizzle, then installs dependencies and applies migrations. Use when the user runs /setup or when dependencies, .env, Docker PostgreSQL, or Drizzle migrations are missing.
disable-model-invocation: true
---

# 개발 환경 셋업

이 스킬은 개발 환경을 준비한다. 이미 있는 파일은 덮어쓰지 말고 빠진 것만 추가한다. 개발 서버(`yarn dev`)는 실행하지 않는다. 패키지 설치와 스크립트는 Yarn 4만 사용한다. 배포용 Dockerfile, `docker-compose.prod.yml`, `yarn docker:build`는 만들지 않는다.

## 결과물

```
apps/web          Vite + React + TypeScript + react-router + Tailwind
apps/api          NestJS + TypeScript + Drizzle
docker-compose.yml
.gitignore
apps/api/.env
apps/web/.env
```

로컬 접속은 화면 `http://localhost:5173`, API `http://localhost:3000/api/health`다.

## 1. 루트

`package.json`이 없으면 다음을 만든다.

- `private: true`
- `packageManager`: Yarn 4 안정 버전
- `engines.node`: `>=22.12.0`
- `workspaces`: `["apps/*"]`
- scripts: `dev`는 `yarn workspaces foreach -A -p -i run dev`, `dev:web`는 `yarn workspace web dev`, `dev:api`는 `yarn workspace api dev`

`.yarnrc.yml`에 `nodeLinker: node-modules`를 둔다.

## 2. 앱

`apps/web`가 없으면 `yarn dlx create-vite@latest apps/web --template react-ts --no-interactive --no-immediate`로 만든다. 패키지 이름은 `web`이다.

`apps/api`가 없으면 `yarn dlx @nestjs/cli new api --directory apps/api --skip-git --skip-install --package-manager yarn --strict --no-observe --language TypeScript`로 만든다. 패키지 이름은 `api`다. ESM(`"type": "module"`, import 경로 `.js`)을 유지한다. `dev` 스크립트는 `nest start --watch`다.

## 3. 화면

`apps/web`에 `react-router`, `tailwindcss`, `@tailwindcss/vite`를 설치한다.

`vite.config.ts` 플러그인에 `tailwindcss()`를 넣고 `/api`를 `http://localhost:3000`으로 프록시한다. `src/index.css`는 `@import "tailwindcss";`만 둔다. `src/main.tsx`는 `react-router`의 `BrowserRouter`로 `App`을 감싼다.

`App`은 `import.meta.env.VITE_API_URL`의 `/health`를 조회해 상태를 한국어로 보여 준다. 생성기가 만든 샘플 화면과 CSS는 제거한다.

## 4. API와 데이터베이스

`apps/api`에 `drizzle-orm`, `postgres`, `@nestjs/config`, `class-validator`, `class-transformer`를 설치한다. 개발 의존성으로 `drizzle-kit`, `dotenv`를 설치한다.

`apps/api/package.json` scripts:

- `db:generate`: `drizzle-kit generate`
- `db:migrate`: `drizzle-kit migrate`

`apps/api/drizzle.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

`apps/api/src/db/schema.ts`는 테이블 없이 Drizzle의 `pgTable`을 쓸 수 있는 상태로 둔다. 테이블은 기능 요청이 있을 때만 이 파일에 추가한다.

`DbService`는 `postgres(DATABASE_URL)`와 `drizzle(client, { schema })`를 만들고, 종료 시 `client.end()`를 호출한다. `@Global()` `DbModule`로 `AppModule`에 한 번만 등록한다. `ConfigModule.forRoot({ isGlobal: true })`를 함께 등록한다.

`main.ts`는 전역 prefix `api`, CORS origin `process.env.WEB_ORIGIN`, `ValidationPipe({ whitelist: true, transform: true })`, `enableShutdownHooks()`를 설정하고 `process.env.PORT ?? 3000`에서 수신한다.

`GET /api/health`는 `sql`로 `SELECT 1`을 실행하고 `{ status: 'ok' }`를 반환한다.

## 5. Git 제외

루트 `.gitignore`를 만들거나, 없으면 아래 항목을 추가한다. 이미 있는 항목은 중복해서 넣지 않는다.

```
node_modules
dist
build
coverage
*.tsbuildinfo
.vite

.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
.pnp.*

.env
.env.*
!.env.example

.DS_Store
```

`.env.example`과 `apps/api/drizzle`의 마이그레이션 SQL은 커밋한다. 앱 생성기가 만든 `.gitignore`는 유지한다.

## 6. 환경 변수

루트 `docker-compose.yml`의 `postgres` 서비스는 `postgres:17`, 사용자 `app`, 비밀번호 `app`, 데이터베이스 `app`, 포트 `5432`, `pg_isready` healthcheck를 사용한다.

`apps/api/.env.example`:

```
DATABASE_URL=postgresql://app:app@localhost:5432/app
PORT=3000
WEB_ORIGIN=http://localhost:5173
```

`apps/web/.env.example`:

```
VITE_API_URL=/api
```

`.env.example`만 커밋 대상이다. `.env`가 없으면 example을 복사한다.

## 7. 실행

프로젝트 루트에서 순서대로 실행한다.

1. `yarn install`
2. `docker compose up -d --wait`
3. `apps/api/drizzle`에 마이그레이션이 없으면 `yarn workspace api db:generate`
4. `yarn workspace api db:migrate`

Docker가 없으면 설치를 멈추고, Docker Desktop을 켠 뒤 `/setup`을 다시 실행하라고 한국어로 알린다. 개발 서버는 켜지 않는다. 완료 후 사용자가 직접 `yarn dev`를 실행하면 된다고 알린다.
