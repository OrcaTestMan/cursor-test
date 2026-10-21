# 원격 DB 사고 조사 (읽기 전용) — 2026-10-21 오전

연결: `postgresql://app:app@211.110.16.130:5432/app` (조회만)

## 1) 서버 API가 쓰는 DB

| 항목 | 값 |
|------|-----|
| DB 이름 | **`app`** |
| DB 유저 | **`app`** |
| health | `200 {"status":"ok","db":"up"}` |
| `/api/users?range=all` | 회원 8명 (아래와 동일) → API도 **`app` DB** 사용 |

`nex` DB가 아님.

## 2) 야간에 원격에서 실행된 명령 (스크립트·터미널 로그 재구성)

셸에 `DATABASE_URL=postgresql://app:app@211.110.16.130:5432/app` 가 잡혀 있던 구간:

| 시각(대략) | 명령 | 성격 |
|------------|------|------|
| ~02:48 | `node scripts/apply-0003.mjs` | **DDL 쓰기** (CHECK·settlement 테이블 등) |
| ~02:48 | Nest `start:dev` (환경변수 원격) | API가 원격 DB 접속 시도 → 이후 가드로 거부 |
| ~02:48–02:49 | `node scripts/test-step2-fix.mjs` (1차, env 원격) | **DML 쓰기** (프로브 회원·출금·배팅) |
| ~02:48 | `node scripts/money-verify-daily.mjs` | 조회 |
| ~02:50 | `node scripts/db-check.mjs` (env 원격) | 조회 |
| ~02:50 이후 | `LOCAL_DATABASE_URL=127.0.0.1` 강제 후 작업 | **로컬만** |

**실행되지 않음(원격):**

- `seed:reset` / `TRUNCATE` / 시드 전체 삭제 → **없음** (0004 테이블 `nex_matches` 등이 원격에 없음으로 확증)
- `apply-0004.mjs` → **없음**

## 3) 삭제성 명령 여부

**원격에서 TRUNCATE/seed:reset/대량 DELETE로 기존 시드를 지운 흔적 없음.**  
기존 시드 6명(admin~user05) 행이 그대로 존재.

## 4) 원격에 추가된 스키마 (야간 0003 계열)

**테이블**

- `nex_bet_settlement_events` ← 야간 추가
- `nex_idempotency_keys` ← 0002 계열(이전 또는 동반). 야간 이전일 수 있음

**컬럼**

- `nex_bets.settlement_revision` (integer default 0)

**제약**

- `nex_users_money_nonneg` CHECK `(money >= 0)`

**인덱스**

- `nex_bet_settle_bet_idx`, `nex_bet_settle_bet_rev_uidx`
- (기존) `nex_money_moves_ref_uidx`, `nex_cash_idempotency_uidx`

**0004 미적용:** `nex_matches` / `markets` / `outcomes` / `bet_legs` / `risk_*` / `audit_logs` / `grade·last_ip` 등 **없음**

## 5) drizzle 마이그레이션 기록

`drizzle.__drizzle_migrations` **13행 존재**.  
마지막(id=13) `created_at=1792600000000` → 로컬 journal의 **0003** 시각과 일치 → **0003 DDL과 기록이 맞춰진 상태**.

- 0004 기록은 **없음** (테이블도 없음) → 정상.
- 아침에 migrate를 돌려도 0003을 다시 깨뜨릴 위험은 낮음(이미 기록됨). 다만 해시가 로컬 파일과 100% 동일인지는 적용 전 한 번 더 대조 권장.

## 6) night_probe_* 건수

| 로그인 | money | 원장 | 출금(cash) | 배팅 |
|--------|-------|------|------------|------|
| night_probe_wd (id7) | 0 | (합산) | | |
| night_probe_bet (id8) | 9000 | | | |
| **합계** | | **13** | **10** | **1** |

`perf_*` 회원: **0**

## 7) 시드 6명

| login | 존재 | money | 원장합=지갑 |
|-------|------|-------|-------------|
| admin | Y | 0 | OK |
| test | Y | **62924** (원래 시드 66924에서 **변경됨**) | OK(정합) |
| test123 | Y | 10000 | OK |
| user03 | Y | 18500 | OK |
| user04 | Y | 12400 | OK |
| user05 | Y | 8600 | OK |

**행 삭제 피해 없음.**  
단 `test` 잔액은 야간 원격 동시성/멱등 테스트로 **66924 → 62924**로 바뀜(출금 50×100 등). cash/원장도 test 쪽에 테스트 흔적 있음(원장 53건).

---

## 정리 계획 (승인 후 실행) — 항목 2

### 0. 백업 (필수 선행)

```bash
# 서버에서 (승인 후)
pg_dump -h 127.0.0.1 -U app -d app -Fc -f /backups/app-pre-cleanup-$(date +%Y%m%d%H%M).dump
```

### 1. 프로브 데이터 삭제 SQL (추천)

```sql
BEGIN;
DELETE FROM nex_bet_settlement_events
 WHERE bet_id IN (SELECT id FROM nex_bets WHERE user_id IN (SELECT id FROM nex_users WHERE login LIKE 'night_probe_%'));
DELETE FROM nex_bets WHERE user_id IN (SELECT id FROM nex_users WHERE login LIKE 'night_probe_%');
DELETE FROM nex_cash_requests WHERE user_id IN (SELECT id FROM nex_users WHERE login LIKE 'night_probe_%');
DELETE FROM nex_money_moves WHERE user_id IN (SELECT id FROM nex_users WHERE login LIKE 'night_probe_%');
DELETE FROM nex_idempotency_keys WHERE key LIKE 'probe-%' OR key LIKE 'probe-night_probe_%';
DELETE FROM nex_users WHERE login LIKE 'night_probe_%';
COMMIT;
```

### 2. DDL: 지우기 vs 마이그레이션 맞추기

**추천: DDL 유지 + 0003 마이그레이션 기록 유지(이미 id=13 존재).**

| 안 | 내용 | 평가 |
|----|------|------|
| **A (추천)** | CHECK·settlement 테이블·컬럼 유지. drizzle 0003 기록 유지. 프로브 DML만 삭제 | 안전. 이후 정식 배포와 스키마 일치 |
| B | DDL DROP 후 원복 | 위험. migrate가 다시 적용하려다 충돌 가능 |

0004는 원격에 없으므로 손대지 않음.

### 3. test 잔액 원복 (선택, 별도 승인)

야간 테스트로 바뀐 `test` 머니/원장을 66924로 되돌리려면 **applyMoney 경로의 관리자 보정** 또는 백업 부분 복원.  
단순 `UPDATE money`는 CHECK는 통과해도 원장 불일치 → **금지**. 승인 시 별도 SQL/API 계획 제출.

### 되돌리기

- 프로브 삭제 → 덤프에서 해당 행 restore 또는 덤프 전체 복원
- DDL 유지 상태에서는 DROP 불필요
- 실수 시 `pg_restore`로 pre-cleanup 덤프 복원

---

## 보안 긴급 조치 계획 (승인 후) — 항목 3

1. **백업** (위와 동일)
2. **5432 외부 차단** (RDP 유지 확인 후)
   - 현재 RDP 세션 유지 확인
   - Windows 방화벽: 5432 inbound를 `127.0.0.1` / Docker만 허용
   - 외부에서 `psql` 거부 확인
   - 롤백: 해당 규칙 삭제
3. **app 비밀번호 교체**
   - 새 비밀번호 생성 → `ALTER ROLE app PASSWORD ...`
   - 서버 `.env` `DATABASE_URL` 갱신 → API 재시작 → health
   - 롤백: 구 비밀번호 임시 복구
4. **Postgres 로그에서 외부 접속 여부 확인** (읽기)
5. **PC `DATABASE_URL` 제거** (아래 안내)

### PC에서 DATABASE_URL 제거

PowerShell (관리자 불필요, User 범위):

```powershell
# 현재 값 확인
[Environment]::GetEnvironmentVariable('DATABASE_URL','User')
[Environment]::GetEnvironmentVariable('DATABASE_URL','Machine')

# User 환경변수 삭제
[Environment]::SetEnvironmentVariable('DATABASE_URL', $null, 'User')

# 현재 세션에서도 제거
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

# 확인 (비어 있어야 함)
[Environment]::GetEnvironmentVariable('DATABASE_URL','User')
```

Machine 범위에 있으면 관리자 PowerShell에서 `'Machine'`으로 동일 삭제.  
Cursor/터미널 **재시작** 후 `echo $env:DATABASE_URL` 이 비는지 확인.  
로컬은 `apps/api/.env`의 `127.0.0.1`만 사용.

---

## 텔레그램 봇 생성 (알림 채널)

1. Telegram에서 `@BotFather` 검색 → `/newbot`
2. 이름·username 설정 → **봇 토큰** 복사
3. 알림 받을 채팅에서 봇과 대화 시작(또는 그룹에 추가)
4. 브라우저: `https://api.telegram.org/bot<TOKEN>/getUpdates` → `chat.id` 확인
5. 서버 `.env` (git 제외):
   ```
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```
6. 잔액 검증/배포 실패 스크립트에서 `sendMessage` 호출 (구현은 보안 조치 후)

---

## main 병합 판단 메모

- **원격 시드 행 삭제 피해: 없음** → [2-보완]·[3] 병합 승인 조건(삭제 피해 없음) **충족**
- 다만 `test` 잔액 변경·프로브 잔존·0003 DDL은 정리 승인 후 처리 권장
- [4]는 화면 연결 완료 후 병합
- 서버 자동 pull: 보안 조치 끝날 때까지 **유지 OFF**
