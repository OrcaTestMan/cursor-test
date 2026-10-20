# 야간 보고서

## 3줄 요약

- **완료:** `[2-보완]` 전부 PASS + 태그 `night-step2fix`. `[3]` seed:reset×3·노출집계 일치 PASS(태그 `night-step3`). `[4]` 리스크 API·정지거부·SSE·상단카드 API 연동 커밋(태그 `night-step4`, 화면/성능은 일부 미달). `[배포·5]` `docs/server-plan.md`·`scripts/deploy-safe.mjs` 준비만(서버 미적용).
- **치명 등급:** 로컬 머니 정합성 테스트는 통과. **단, 셸 환경변수 `DATABASE_URL`이 `211.110.16.130`을 가리켜 야간 초반에 원격 DB에 DDL/프로브 데이터가 들어간 사고**가 있음 → 아침 점검·정리 필요. 이후 로컬 강제 + `ALLOW_REMOTE_DB` 가드 추가.
- **아침 결정:** (1) 원격 DB 사고 정리 범위 (2) `dev`→`main` 병합 승인 목록 (3) 알림 채널(텔레그램 vs 이메일) (4) `PERF_FULL=1` 대규모 perf 재실행 여부

---

## [2-보완] 돈 처리 보완

| 완료 기준 | 결과 |
|-----------|------|
| 출금 동시성 10/40/잔액0/검증0 | **통과** |
| 배팅 동시성 초과분 거부·음수0 | **통과** (데드락→유저 잠금 선순서로 수정) |
| 재정산 적중→낙첨→적중 잔액=원장 | **통과** |
| 배팅 멱등 같은키 2회→1건 | **통과** |
| CHECK money>=0 음수 거부 | **통과** (`0003`) |
| 일일 검증 잡 | **통과**(로그 파일). 알림 채널은 미정 → 미달 아님 |

- 마이그레이션: `0003_money_nonneg_settlement.sql`
- 태그: `night-step2fix` → `c275918`
- 실패 재시도: 배팅 동시성 데드락 1회 → 잠금 순서 수정 후 통과

## [3] 시드 보강

| 완료 기준 | 결과 |
|-----------|------|
| seed:reset 3회, 검증 0 | **통과** (18명/46배팅, mismatch 0) |
| risk_exposure = 원본 집계 | **통과** (match0 단폴 stake 210800=210800) |
| seed:perf | **미달(축소)** users 500 / bets 5k / moves 10k, **589ms**. 목표 1만·100만·300만은 `PERF_FULL=1`로 아침 재실행 권장 |

- 마이그레이션: `0004_risk_seed_schema.sql`
- 명령: `ALLOW_SEED_RESET=1 npm run seed:reset` / `npm run seed:perf`
- 태그: `night-step3`

## [4] 리스크 모니터링 DB 연결

| 완료 기준 | 결과 |
|-----------|------|
| API summary/matches/상세/members/alerts/actions/settings | **통과**(로컬 스모크) |
| 화면 숫자 = SQL | **부분** — 상단 카드 API hydrate. 목록/전체 화면 localStorage 데모 잔존 → **미달** |
| 배팅 추가 3초 내 반영 | SSE `/api/risk/stream` 3초 힌트 → hydrate. E2E 시계측 **미달**로 기록 |
| 마켓 정지 후 배팅 거부 | **통과** |
| seed:perf p95 ≤300ms + EXPLAIN | **미달** — 축소 perf만, EXPLAIN 미첨부 |

- 태그: `night-step4`
- 선택지: 아침에 리스크 목록 테이블을 `/api/risk/matches`로 전면 교체, EXPLAIN ANALYZE 첨부

## [배포 구조] + [5] (준비만)

- 문서: [docs/server-plan.md](./server-plan.md)
- 스크립트: `scripts/deploy-safe.mjs` (dry-run, `DEPLOY_RESTART=1` 시에만 재시작 자리)
- 원격 health(읽기 전용): `200 {"status":"ok","db":"up"}`
- **서버 변경 없음**(의도된 적용 없음). 단 아래 사고 참고.

## 원격 DB 사고 (아침 필수)

- 원인: Windows/셸에 `DATABASE_URL=postgresql://app:app@211.110.16.130:5432/app` 가 설정되어 스크립트·초기 API가 원격에 연결됨.
- 추정 영향: `nex_users_money_nonneg` CHECK, `settlement_revision`, `nex_bet_settlement_events`, 프로브 로그인(`night_probe_*`) 및 관련 원장/출금/배팅.
- 대응(이미 적용): 로컬 URL 강제, `DbService` 원격 거부 가드(`ALLOW_REMOTE_DB=1` 없으면 거부), 테스트 스크립트 원격 거부.
- **아침 할 일:** 원격에서 프로브 데이터·불필요한 DDL 존재 여부 확인 후, 승인 하에 정리 또는 유지.

## 추가 마이그레이션

- `0003_money_nonneg_settlement.sql`
- `0004_risk_seed_schema.sql`
- (0000~0002 미수정)

## dev 커밋·태그

| 태그 | 커밋 | 의미 |
|------|------|------|
| `night-step2fix` | `c275918` | 머니 보완 완료 |
| `night-step3` | `5f496e8` | 시드/0004 완료 |
| `night-step4` | `5f496e8` | 리스크 API+부분 화면 ([3][4] 동일 커밋) |

브랜치: `dev` (main 미병합).

## main 병합 승인 요청 목록

1. `[2-보완]` 머니 잠금·재정산·CHECK·원격가드
2. `[3]` 0004 스키마 + seed:reset/perf
3. `[4]` RiskModule API + risk 카드 API hydrate
4. 배포 문서/스크립트(동작 변경 없음)

## 서버 적용 계획

→ [docs/server-plan.md](./server-plan.md)
