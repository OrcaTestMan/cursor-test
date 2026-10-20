# API 계약 (NEX)

전역 prefix: `/api`

## Health

`GET /api/health` — 서버 생존 확인. 인증 없음.

응답 예: `{ "ok": true }` 또는 AppService가 반환하는 JSON.

## 데이터베이스

영속 데이터는 PostgreSQL `nex` DB. 스키마·시드는 `apps/api/src/db/`. 도메인 REST(회원·배팅 CRUD 등)는 스키마 구체화 후 모듈을 붙인다. 현재 최소 구성은 health + DB 연결이다.
