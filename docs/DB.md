# NEX 데이터베이스

로컬·서버 PC 모두 Docker PostgreSQL을 쓴다.

## 연결

| 항목 | 값 |
| --- | --- |
| 컨테이너 | `nex-postgres` (`docker compose`) |
| DB 이름 | `nex` |
| 사용자 / 비밀번호 | `nex` / `nex` |
| 포트 | `5432` |
| URL | `postgresql://nex:nex@localhost:5432/nex` |

`apps/api/.env`의 `DATABASE_URL`에 위 URL을 둔다. 비밀번호는 Git에 올리지 않는다(예시만 `.env.example`).

## 테이블 (`nex_*`)

| 테이블 | 용도 |
| --- | --- |
| `nex_users` | 회원·관리자 (**핵심**) |
| `nex_money_moves` | 머니 원장 (**핵심**) |
| `nex_cash_requests` | 입출금 신청 (**핵심**) |
| `nex_bets` | 스포츠 배팅 (**핵심**) |
| `nex_casino_bets` | 카지노 배팅 (**핵심**) |

| `nex_point_moves` | 포인트 이동 |
| `nex_dist_agents` | 총판 |
| `nex_dist_payouts` | 총판 지급 |
| `nex_dist_accruals` | 수당 적립 |
| `nex_review_flags` | 정산 전 검수 |
| `nex_wallet_settings` | USDT 지갑 |
| `nex_banners` | 배너 |
| `nex_inquiries` | 1:1 문의 |
| `nex_activity_logs` | 활동 로그 |
| `nex_settings` | 키-값 설정 |

스키마 원본: `apps/api/src/db/schema.ts`.

## 초기화

프로젝트 루트:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-nex-db.ps1
```

수동:

```bash
docker compose up -d --wait
yarn workspace api db:generate   # 스키마 변경 시
yarn workspace api db:migrate
yarn workspace api db:seed
```

## 서버 PC (`211.110.16.130`)

코드는 Git push 후 `NexGitAutoPull`로 반영된다.

NEX 스키마는 원격에서 다음으로 구체화한다(이미 적용됨).

```powershell
yarn node scripts/setup-server-nex-db.mjs
```

- Postgres에 `nex` DB·`nex` 유저·`nex_*` 14테이블·시드 회원 6명
- 서버 `app` DB의 구 테이블은 삭제하고 동일 `nex_*`를 적용
- API 기동 시 `migrateOnBoot`가 마이그레이션을 재적용한다
- `GET http://211.110.16.130:3000/api/health` → `{"status":"ok"}`

권장 `DATABASE_URL`: `postgresql://nex:nex@localhost:5432/nex`  
(서버 로컬 컨테이너 기준. 당분간 `app` DB에도 동일 `nex_*`가 있을 수 있다.)
