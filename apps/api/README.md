# api

NestJS API다. 전역 prefix는 `/api`이고, 데이터베이스는 PostgreSQL과 Drizzle을 사용한다.

루트에서 의존성을 설치하고 PostgreSQL을 띄운 뒤 개발 서버를 실행한다. 절차는 [루트 README](../../README.md)와 [개발 문서](../../docs/development.md)를 본다.

```bash
yarn dev:api
```

상태 확인은 http://localhost:3000/api/health 이다. 스키마는 `src/db/schema.ts`만 수정하고, 변경 후에는 마이그레이션을 생성하고 적용한다.

```bash
yarn db:generate
yarn db:migrate
```

이 명령은 `apps/api` 디렉터리 기준이다. 루트에서는 `yarn workspace api db:generate`, `yarn workspace api db:migrate`를 사용한다.
