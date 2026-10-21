# 서버 DB 재구성 절차 (실행용)

> **이 문서는 서버 Cursor가 서버 PC에서 그대로 실행한다.**  
> 로컬 개발 PC에서는 실행하지 않는다. 패치(기존 13개 drizzle 이력 위에 0003/0004만 덧댐)는 하지 않는다.  
> 운영 전 데모 데이터만 있으므로 **백업 후 새 DB를 만들고**, 로컬과 같은 마이그레이션 0000~0004 + 테스트 없는 기본 시드만 넣는다.

대상: `211.110.16.130` Windows 서버.  
코드: `dev` 브랜치 최신 (이 문서가 들어 있는 커밋).  
금지: 프로브 DELETE, `test` 잔액 보정, `app:app` 유지, `seed:reset`/`seed:perf`/`db:seed`(테스트 회원 포함).

---

## 0. 사전 확인 (조회만)

PowerShell:

```powershell
hostname
Get-NetIPAddress -AddressFamily IPv4 | Format-Table IPAddress,InterfaceAlias
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
Get-NetTCPConnection -LocalPort 5432,3000,3389 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'nest|start:prod|dist\\main' } |
  Select-Object ProcessId,CommandLine
```

확인할 것:

- 이 기기가 서버인지 (공인 IP `211.110.16.130`)
- Postgres가 Docker인지 (`nex-postgres` 또는 다른 이름)
- API가 `start:dev`인지 `node dist/main`(운영)인지
- **3389(RDP)가 Listen인지.** 끊기면 복구가 어려우니 세션을 유지한 채로만 진행

Docker가 아니면 아래 `docker exec nex-postgres` 자리를 실제 `psql` 경로로 바꾼다. 컨테이너 이름이 다르면 이름을 치환한다.

---

## 1. 기존 `app` DB 전체 백업

```powershell
New-Item -ItemType Directory -Force -Path C:\backups | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dump = "C:\backups\app-before-rebuild-$stamp.dump"
$env:PGPASSWORD = 'app'
docker exec -e PGPASSWORD=app nex-postgres pg_dump -U app -d app -Fc -f /tmp/app.dump
docker cp nex-postgres:/tmp/app.dump $dump
docker exec nex-postgres rm -f /tmp/app.dump
Get-Item $dump | Format-List FullName,Length,LastWriteTime
docker run --rm -v C:\backups:/backups postgres:17 pg_restore --list "/backups/$(Split-Path $dump -Leaf)"
Remove-Item Env:PGPASSWORD
```

Docker 안에서 `app` DB·`app` 유저가 없다면, 서버 `.env`의 `DATABASE_URL`에서 호스트/DB/유저만 확인하고 같은 방식으로 dump한다. **비밀번호 값은 git/채팅에 적지 않는다.**

`pg_restore --list`에 `dbname: app`, `nex_users`, `nex_money_moves` TOC가 보이면 백업 정상.  
파일 경로·크기·시각을 기록해 둔다. 이 파일이 롤백 원본이다.

이미 `C:\backups\app-*.dump`가 있어도 **재구성 직전에 한 번 더** 뜬다.

---

## 2. 새 DB 계정 생성 (`app:app` 폐기)

비밀번호는 서버에서만 만들고 `.env`에만 넣는다. git에 커밋하지 않는다.

```powershell
Add-Type -AssemblyName System.Web
$pass = [System.Web.Security.Membership]::GeneratePassword(28, 6)
$passFile = "C:\backups\nex-app-pass-$stamp.txt"
Set-Content -Path $passFile -Value $pass -NoNewline
# 아래 SQL의 CHANGE_ME 를 $pass 로 바꿔 실행. 채팅/커밋에 $pass 를 출력하지 말 것.
```

Postgres에서 (예시, 실제 비밀번호는 파일 값):

```powershell
# 컨테이너 슈퍼유저가 postgres 인 경우
docker exec -i nex-postgres psql -U postgres -d postgres -c "CREATE ROLE nex_app LOGIN PASSWORD 'CHANGE_ME';"
docker exec -i nex-postgres psql -U postgres -d postgres -c "CREATE DATABASE nex OWNER nex_app;"
docker exec -i nex-postgres psql -U postgres -d nex -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

- 새 DB 이름: `nex`
- 새 롤: `nex_app` (강한 비밀번호)
- 구 계정 `app` / 구 DB `app` 은 아직 drop 하지 않는다 (롤백용)

연결 확인 (서버 안에서만):

```powershell
docker exec -e PGPASSWORD=CHANGE_ME nex-postgres psql -U nex_app -d nex -c "select current_user, current_database();"
```

`nex_app` / `nex` 가 나오면 통과.

---

## 3. 마이그레이션 0000~0004 + 서버용 기본 시드

코드가 `dev` 최신인지 확인한 뒤, **새 `nex` DB**에만 적용한다. 구 `app`에는 적용하지 않는다.

프로젝트 루트에서:

```powershell
cd <저장소루트>
$env:DATABASE_URL = "postgresql://nex_app:CHANGE_ME@127.0.0.1:5432/nex"
$env:ALLOW_REMOTE_DB = $null
yarn workspace api db:migrate
```

`apps/api/drizzle` 의 0000~0004가 적용된다. 확인:

```powershell
docker exec -e PGPASSWORD=CHANGE_ME nex-postgres psql -U nex_app -d nex -c "select id, hash from drizzle.__drizzle_migrations order by id;"
```

기대: **행 5개** (로컬과 같은 0000~0004). 구 `app`의 13개 해시와 같아질 필요는 없다. 새로 만드는 것이 목적이다.

기본 시드 (테스트 회원·배팅·프로브 없음, 관리자·지갑설정·리스크설정만):

```powershell
$env:ALLOW_SEED_OPS = '1'
$env:DATABASE_URL = "postgresql://nex_app:CHANGE_ME@127.0.0.1:5432/nex"
$env:ADMIN_USERNAME = 'admin'
yarn workspace api seed:ops
Remove-Item Env:ALLOW_SEED_OPS
```

확인:

```sql
select login, role, money from nex_users;
-- admin 1명, money 0. night_probe_* / test / test123 없어야 함
select count(*) from nex_bets;
-- 0
select count(*) from nex_money_moves;
-- 0
select count(*) from nex_risk_settings;
-- 1
```

`yarn workspace api db:seed` 와 `ALLOW_SEED_RESET=1 npm run seed:reset` 은 **쓰지 않는다** (테스트 데이터 들어감).
`scripts/setup-server-nex-db.mjs` 는 구 `app:app` 원격 패치용이다. **이 재구성에서는 실행하지 않는다.**

---

## 4. 서버 `.env` 교체 → API 재시작 → health

`apps/api/.env` (git 제외) 예시:

```
DATABASE_URL=postgresql://nex_app:CHANGE_ME@127.0.0.1:5432/nex
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<10자 이상 강한 값>
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
```

구 `postgresql://app:app@.../app` 줄은 지운다. 백업 `.env`는 `C:\backups\env-before-rebuild-$stamp.txt` 로만 보관.

API 재시작 (서버의 실제 방식에 맞춤):

```powershell
# 운영이면
yarn workspace api build
# 기존 node/nest 프로세스를 확인한 뒤, 구 프로세스를 종료하고
yarn workspace api start:prod
# 또는 NSSM/작업스케줄러가 있으면 그 서비스를 재시작
```

`start:dev` 로 운영하지 않는다.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
# {"status":"ok","db":"up"}
```

같은 서버에서만:

```powershell
yarn workspace api risk:verify-screen
yarn workspace api money:verify-daily
```

둘 다 mismatch 0 / exit 0.

---

## 5. `log_connections` 켜기

```powershell
docker exec nex-postgres psql -U postgres -d postgres -c "ALTER SYSTEM SET log_connections = on;"
docker exec nex-postgres psql -U postgres -d postgres -c "SELECT pg_reload_conf();"
docker exec -e PGPASSWORD=CHANGE_ME nex-postgres psql -U nex_app -d nex -c "show log_connections;"
```

`on` 이면 통과.

---

## 6. 구 `app` 계정 폐기 (health 통과 후)

```sql
-- 새 연결이 nex_app/nex 인지 재확인한 뒤에만
REVOKE CONNECT ON DATABASE app FROM app;
ALTER ROLE app NOLOGIN;
```

`app` DB 자체는 바로 DROP 하지 않는다. 최소 하루, 롤백 확인 후:

```sql
-- 승인 후에만
-- ALTER DATABASE app RENAME TO app_old_YYYYMMDD;
```

---

## 7. 문제 시 기존 DB로 되돌리기

1. API 프로세스를 멈춘다. (RDP/3389는 건드리지 않는다.)
2. `.env`를 `C:\backups\env-before-rebuild-*.txt` 로 되돌린다 (`app` URL).
3. `app` 롤이 `NOLOGIN`이면 `ALTER ROLE app LOGIN;`
4. 백업 파일이 필요하면 (DB가 깨진 경우):

```powershell
$dump = "C:\backups\app-before-rebuild-YYYYMMDD-HHMMSS.dump"
docker cp $dump nex-postgres:/tmp/app.dump
docker exec -e PGPASSWORD=app nex-postgres pg_restore --clean --if-exists -U app -d app /tmp/app.dump
```

5. API를 재시작하고 `GET /api/health` 가 `db:up`인지 확인한다.
6. 새 `nex` DB는 남겨 두어도 된다. 원인 확인 후 삭제.

마이그레이션 down은 쓰지 않는다. 롤백은 **덤프 복원 또는 구 `app` 재연결**만 한다.

---

## 8. 프로브 정리·test 잔액 원복이 필요한가?

**필요 없다.**

구 `app`에는 `night_probe_*`, 변경된 `test`(62924), 데모 시드, drizzle 13행이 남아 있다.  
이 절차는 그 DB를 고치지 않고 **새 `nex`를 만든 뒤 API만 옮긴다.**

| 기존 이슈 | 재구성 후 |
|-----------|-----------|
| `night_probe_*` 회원/원장/출금/배팅 | 새 DB에 없음 → 삭제 불필요 |
| `test` 잔액 62924 / `admin_adjust` | 새 DB에 `test` 없음 → 원복 불필요 |
| drizzle 13개 vs 로컬 5개 | 새 DB는 0000~0004 5개 |
| `app:app` 외부 접속 | 새 계정 + 구 계정 NOLOGIN |

구 `app`은 롤백용으로만 남긴다. 운영 트래픽은 `nex`만 본다.

---

## 9. 하지 말 것

- 이 문서를 로컬 PC(`183.*` 등)에서 실행
- 구 `app`에 `0003`/`0004`만 패치
- `ALLOW_SEED_RESET=1` / `PERF_FULL` / `db:seed`
- `main` 병합 (별도 승인 전)
- 3389 방화벽/포트 변경
- `.env`·비밀번호를 git에 추가
- 백업 없이 DROP DATABASE
