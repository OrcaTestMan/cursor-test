# NEX

TypeScript 모노레포다. 관리 화면은 Vite·정적 HTML(`apps/web/public/nex`), API는 NestJS, 데이터베이스는 PostgreSQL·Drizzle이다.

## 요구 사항

- Node.js 22.12.0 이상
- Yarn 4.18.1 (`packageManager` 필드)
- 로컬·서버 PostgreSQL용 Docker Desktop

## 시작

```bash
yarn install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

NEX DB 초기화(권장):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-nex-db.ps1
```

또는 수동:

```bash
docker compose up -d --wait
yarn workspace api db:migrate
yarn workspace api db:seed
yarn dev
```

- NEX 관리: http://localhost:5173/nex/dashboard.html
- 입구 `/`: 대시보드로 이동
- API: http://localhost:3000/api/health
- DB: `postgresql://nex:nex@localhost:5432/nex` — 자세한 표는 [docs/DB.md](docs/DB.md)

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `yarn dev` | 화면과 API를 함께 실행 |
| `yarn workspace api db:generate` | 스키마 → 마이그레이션 |
| `yarn workspace api db:migrate` | 마이그레이션 적용 |
| `yarn workspace api db:seed` | NEX 예시 데이터 |

## 구성

```
apps/web    Vite + public/nex 관리 화면
apps/api    NestJS, Drizzle, PostgreSQL (nex_*)
```
