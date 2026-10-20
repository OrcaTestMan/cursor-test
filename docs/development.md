# 개발

1. `yarn install`
2. `apps/api/.env` — `DATABASE_URL=postgresql://nex:nex@localhost:5432/nex`
3. `docker compose up -d --wait`
4. 스키마 변경 시: `yarn workspace api db:generate` → `yarn workspace api db:migrate`
5. `yarn workspace api db:seed` (최초)
6. `yarn dev`

서버 PC도 동일. 코드 반영은 Git auto-pull, DB는 `scripts/setup-nex-db.ps1` 한 번.
