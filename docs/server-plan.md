# 서버 적용 계획 ([배포 구조] + [5]) — 준비 전용

> **적용 금지.** 이 문서는 스크립트·절차만 정의한다. `211.110.16.130` 에 대한 변경은 대표님 승인 후에만 수행한다.

## 읽기 전용 확인 (야간 시점)

| 항목 | 결과 |
|------|------|
| 원격 health | `GET http://211.110.16.130:3000/api/health` → `200 {"status":"ok","db":"up"}` |
| 로컬 health | `GET http://localhost:3000/api/health` → `200 {"status":"ok","db":"up"}` |
| 로컬 실행 모드 | `nest start --watch` (dev). 운영은 `npm run start:prod` |
| 적용된 마이그레이션 (로컬) | `0000`~`0003` (+ 야간 중 `0004+`는 night-report 참고) |
| 원격 마이그레이션 | **조회만 허용.** 야간 중 셸 `DATABASE_URL`이 원격을 가리켜 의도치 않은 DDL이 들어간 이력이 있음 → night-report 「원격 DB 사고」참고. 아침 점검 필수. |

## 브랜치 규칙

- 일상 작업: `dev`
- `main`: 대표님 승인 후만 병합
- 야간 태그: `night-step2fix`, `night-step3`, `night-step4` (문제 시 해당 태그로 되돌리기)

## 자동 반영 스크립트 (초안)

경로: `scripts/deploy-safe.mjs` (준비), 서버 스케줄러/CI에서 호출.

순서:

1. `git fetch` + `git checkout` 승인된 ref (`main` 또는 승인 태그)
2. `yarn install --frozen-lockfile` (또는 `npm ci`)
3. `yarn build` / `npm run build` (api + web)
4. `yarn test` / `npm test` (실패 시 **재시작 안 함**, 기존 프로세스 유지)
5. 테스트 통과 시만 프로세스 재시작 (`pm2 reload` 또는 Windows 서비스 restart)
6. `GET /api/health` — 실패 시 `git reset --hard PREV_SHA` + 재시작 + 알림
7. 운영 모드: `node dist/main` (`start:dev` 금지)

실패/롤백/잔액 불일치 알림:

| 채널 | 장점 | 단점 | 추천 |
|------|------|------|------|
| 텔레그램 봇 | 즉시성, 모바일 | 토큰·채팅방 관리 | **1순위 (운영 알림)** |
| 이메일 | 감사 추적 | 지연·스팸함 | 일일 요약·감사 백업 |

추천: 치명(잔액 불일치·health 실패)은 텔레그램, 일일 verify 요약은 이메일 또는 텔레그램 둘 다.

## [5] 서버 작업 체크리스트 (승인 후)

### 5.1 마이그레이션

1. DB 백업 (`pg_dump` → `backups/nex-YYYYMMDD-HHMM.sql`)
2. 로컬/`dev`에서 이미 통과한 마이그레이션만 적용
3. `drizzle` journal / `__drizzle_migrations` 확인
4. `/api/money-moves/verify` → mismatch 0
5. 실패 시: 덤프 복원 + 앱 이전 커밋으로 롤백

### 5.2 API 자동 재시작

- Linux: `pm2` ecosystem (`apps/api`, `start:prod`, max memory restart)
- Windows: NSSM 또는 Windows Service로 `node dist/main`, Failure 시 Restart
- `deploy-safe` 성공 시에만 reload

### 5.3 DB 계정 교체

1. 새 롤 생성 (예: `nex_app`) + 강한 비밀번호
2. `.env`에만 기록, **git 제외 확인** (`.gitignore`)
3. 앱 재시작 후 구계정 `nex`/`app` 로그인 폐기
4. 롤백: 구계정 임시 재활성 + `.env` 복구

### 5.4 5432 외부 차단

1. RDP/SSH 세션이 살아 있는지 확인 (끊기면 복구 불가)
2. 방화벽: 5432 inbound를 localhost / docker bridge만 허용
3. 앱이 unix socket 또는 `127.0.0.1:5432`로만 접속하는지 확인
4. 외부에서 `psql` 접속 시도 → 거부 확인
5. 롤백: 해당 방화벽 규칙 삭제 (RDP는 3389 유지)

### 5.5 매일 백업

- cron/Task Scheduler: `pg_dump` → 7일 보관
- 주 1회 복원 테스트 (별도 DB `nex_restore_test`)
- 실패 시 텔레그램 알림

## 되돌리기 요약

| 작업 | 롤백 |
|------|------|
| 코드 배포 | `git reset --hard PREV` + 재시작 |
| 마이그레이션 | 덤프 복원 (다운 마이그레이션 비권장) |
| DB 계정 | 구계정 복구 + `.env` |
| 방화벽 | 규칙 삭제 |
| 잔액 사고 | 서비스 중지 → verify → 원장 대조 → 수동 보정은 applyMoney만 |

## 관련 스크립트 (로컬 준비)

- `apps/api/scripts/money-verify-daily.mjs` — 일일 잔액 검증 로그
- `scripts/deploy-safe.mjs` — (작성 예정/야간) 빌드·테스트·health 가드
