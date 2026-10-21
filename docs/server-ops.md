# 서버 운영 메모 (211.110.16.130)

Windows 서버에서 Nest API·Docker Postgres를 상시 운영할 때 쓰는 점검·복구 절차다.  
비밀번호·`.env` 내용은 이 문서에 적지 않는다.

## 구성 요약

| 구성 | 값 |
| --- | --- |
| API 서비스 | Windows 서비스 `nex-api` (NSSM), 시작 유형 자동 |
| API 실행 | `node dist/main.js`, 작업 폴더 `apps/api` |
| API 로그 | `C:\nex\logs\nex-api.out.log`, `C:\nex\logs\nex-api.err.log` (약 10MB 회전) |
| Postgres 컨테이너 | `nex-postgres-clean` (`postgres:17.11`) |
| Postgres 포트 | `127.0.0.1:5432` 만 |
| 컨테이너 restart | `unless-stopped` |
| 시크릿 | `C:\backups\live-secrets\` (git 금지) |
| 사고 증거 | `C:\backups\incident-20261021\` (복원 금지) |

자동 배포 작업(`NexGitAutoPull`)은 1분마다 안전 배포 스크립트를 호출한다.  
프론트엔드(Vite) 전용 Windows 서비스는 없다. 서버는 `nex-api`(3000)만 NSSM으로 상시 실행하며, 배포 시 web·api 둘 다 빌드하지만 재시작은 API만 한다.

## 재부팅 후 복구 순서

1. **로그인**  
   RDP(3389)로 서버에 로그인한다. (방화벽에서 3389는 유지)

2. **Docker 실행 확인**  
   - 시스템 트레이에 Docker Desktop이 떠 있는지 본다.  
   - PowerShell: `docker info` 가 에러 없이 응답하는지 확인한다.  
   - 안 되면 Docker Desktop을 수동 실행한 뒤 엔진이 뜰 때까지 기다린다.

3. **`nex-postgres-clean` 상태**  
   ```powershell
   docker ps --filter name=nex-postgres-clean
   docker inspect nex-postgres-clean --format "Status={{.State.Status}} Health={{.State.Health.Status}} Restart={{.HostConfig.RestartPolicy.Name}}"
   ```  
   - 기대: `Up` + `healthy`, Restart=`unless-stopped`  
   - 중지되어 있으면: `docker start nex-postgres-clean`

4. **`nex-api` 상태**  
   ```powershell
   Get-Service nex-api
   nssm status nex-api
   ```  
   - 기대: `Running`  
   - 중지되어 있으면: `nssm start nex-api` 또는 `Start-Service nex-api`  
   - API가 DB보다 먼저 떠서 실패했어도 NSSM이 약 5초 간격으로 재시작한다. Postgres healthy 이후 health가 붙는지 확인한다.

5. **health 확인**  
   ```powershell
   Invoke-RestMethod http://127.0.0.1:3000/api/health
   ```  
   - 기대: `{ "status": "ok", "db": "up" }`

## 서비스 관리 명령

NSSM 경로는 winget 설치 위치에 있을 수 있다. `nssm` 이 PATH에 있으면 그대로 쓴다.

```text
시작:     nssm start nex-api
중지:     nssm stop nex-api
재시작:   nssm restart nex-api
상태:     nssm status nex-api
```

또는:

```powershell
Start-Service nex-api
Stop-Service nex-api
Restart-Service nex-api
Get-Service nex-api
```

## 로그 위치

- 표준 출력: `C:\nex\logs\nex-api.out.log`
- 표준 에러: `C:\nex\logs\nex-api.err.log`
- 회전: NSSM `AppRotateFiles` / `AppRotateOnline` / `AppRotateBytes=10485760`

## Docker / compose

서버용 파일은 `docker-compose.server.yml` 이다. (`name: nex-clean` 고정)  
PC 로컬 개발용 `docker-compose.yml` 과 섞지 않는다.

- 이미지: `postgres:17.11`
- 컨테이너: `nex-postgres-clean`
- `restart: unless-stopped`
- 포트: `127.0.0.1:5432:5432`
- env 파일: `C:/backups/live-secrets/postgres.env` (git 밖)
- 볼륨: `nex_pg_clean_20261021`

서버에서 compose 명령은 항상 `-f docker-compose.server.yml` 을 붙인다.  
프로젝트 이름 `nex-clean` 은 파일의 `name:` 으로 유지되므로 기존 컨테이너를 새로 만들지 않는다.

```powershell
cd <저장소루트>
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml up -d --wait
```

## 되돌리기

### nex-api 서비스 제거

```text
nssm stop nex-api
nssm remove nex-api confirm
```

필요하면 이후 수동으로 `yarn workspace api start:prod` 를 쓴다.

### 컨테이너 restart 정책 되돌리기

```powershell
docker update --restart=no nex-postgres-clean
```

`docker-compose.server.yml` 의 `restart: unless-stopped` 줄도 제거하거나 `no` 로 바꾼다.

### Docker 자동 시작 되돌리기

- Docker Desktop 설정에서 Start Docker Desktop when you log in 해제, 또는  
  `%APPDATA%\Docker\settings-store.json` 의 `AutoStart` 를 `false`
- `Set-Service com.docker.service -StartupType Manual`

### Windows Update 자동 재부팅 방지 되돌리기

관리자 PowerShell:

```powershell
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name NoAutoRebootWithLoggedOnUsers -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name AUOptions -ErrorAction SilentlyContinue
# 활성 시간은 설정 앱 > Windows Update > 활성 시간에서 수동 조정
```

## 코드 반영

서버 작업 폴더는 평소 `main` 을 유지한다.  
`.env`, `C:\backups\` 시크릿·증거는 절대 커밋하지 않는다.

운영 API는 기동 때 마이그레이션을 돌리지 않는다. DB 구조 변경은 백업 후 `yarn workspace api db:migrate` 로만 적용한다.

## 마이그레이션 포함 수동 적용 (서버 Cursor)

자동 배포는 `apps/api/drizzle/` 에 **신규 추가**된 파일이 있으면 pull 하지 않고 `migration_manual_approval_required` 로 끝난다.  
이 커밋(관리자 로그인, `0005_admin_auth.sql`)은 아래 순서를 **그대로** 따른다.  
비밀번호·TOTP·otpauth·`.env` 내용은 터미널·채팅에 출력하지 않는다.

**저장소루트**는 `NexGitAutoPull` 이 `git fetch` 하는 폴더다. 아래 중 하나로 확인한다.

```powershell
Get-Content C:\nex\deploy\run-auto-deploy.ps1
# DEPLOY_ROOT 또는 $root 가 저장소루트
Get-Content C:\nex\logs\deploy.log -Tail 5
```

### 0. 자동 배포 잠시 끄기

수동 pull 중에 1분 주기 작업이 끼어들지 않게 한다.

```powershell
Disable-ScheduledTask -TaskName NexGitAutoPull
Get-ScheduledTask -TaskName NexGitAutoPull | Select-Object TaskName, State
```

기대: `State` = `Disabled`

### 1. DB 백업

컨테이너 `nex-postgres-clean` 의 env(`POSTGRES_USER`, `POSTGRES_DB`)로 덤프한다. 비밀번호를 찍지 않는다.

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path C:\backups | Out-Null
docker exec nex-postgres-clean sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/nex.dump'
docker cp nex-postgres-clean:/tmp/nex.dump "C:\backups\nex-pre-admin-auth-$stamp.dump"
docker exec nex-postgres-clean rm -f /tmp/nex.dump
Get-Item "C:\backups\nex-pre-admin-auth-$stamp.dump" | Select-Object FullName, Length
```

`Length` 가 0 이면 중단한다.

### 2. main pull

```powershell
cd <저장소루트>
git status --porcelain
git fetch origin main
git pull --ff-only origin main
git rev-parse --short HEAD
git rev-parse --short origin/main
```

`HEAD` 와 `origin/main` 이 같아야 한다. dirty 이면 중단하고 보고한다.

### 3. 의존성 · 빌드

```powershell
cd <저장소루트>
yarn install --immutable
yarn workspace web build
yarn workspace api build
```

### 4. 마이그레이션 (이 단계에서만)

```powershell
cd <저장소루트>
yarn workspace api db:migrate
```

`apps/api/.env` 의 `DATABASE_URL` 이 이 서버 로컬 Postgres 를 가리키는지 확인한다. 원격 IP 로 붙이지 않는다.

### 5. API 재시작 · health

```powershell
nssm restart nex-api
# 또는 Restart-Service nex-api
Start-Sleep -Seconds 3
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

기대: `{ "status": "ok", "db": "up" }`  
실패하면 `C:\nex\logs\nex-api.err.log` 를 보고 마이그레이션·`.env` 를 점검한다. 자동 배포는 아직 켜지 않는다.

### 6. 첫 관리자 생성

비밀번호는 인자로 넣지 않는다. 스크립트가 랜덤 생성해 파일에만 쓴다.

```powershell
New-Item -ItemType Directory -Force -Path C:\nex\secrets | Out-Null
cd <저장소루트>
yarn workspace api admin:create -- --login <아이디> --nick 관리자 --role superadmin
```

터미널에는 아래 **경로 두 줄만** 나와야 한다.

```text
C:\nex\secrets\admin-<아이디>.txt
C:\nex\secrets\admin-<아이디>-qr.png
```

비밀번호·TOTP 시크릿·otpauth 주소가 보이면 실패다. 채팅에 파일 내용을 붙여 넣지 않는다.  
QR 은 서버에서 Google Authenticator 로만 찍는다.

### 7. 확인

브라우저를 서버에서 연다. 비밀값은 채팅에 쓰지 않는다.

1. `http://127.0.0.1:3000/nex` → 로그인 화면
2. 파일의 아이디·비밀번호 + Authenticator 6자리로 로그인
3. 회원 목록이 보이는지
4. 로그아웃 후 다시 `/nex` → 로그인 화면

### 8. 자동 배포 기록 맞추기 (필수)

수동으로 이미 이 커밋을 적용했으므로, 자동 배포가 **다시 막거나 재시도하지 않게** 맞춘다.

동작 요약:

| 상태 | 다음 `NexGitAutoPull` |
| --- | --- |
| `HEAD` == `origin/main` | `no_new_commits` 로 종료. pull·빌드·재시작 없음 |
| `C:\nex\logs\deploy-failed-sha.txt` 가 현재 SHA | `HEAD` 가 뒤처져 있으면 `same_as_previous_failure` 로 계속 스킵. 마이그레이션 대기는 이 파일을 쓰지 않음 |
| `HEAD` 가 `origin/main` 보다 뒤처짐 + drizzle 신규 파일 | 매분 `migration_manual_approval_required` + 알림 |

수동 적용 뒤에는 `HEAD` 를 `origin/main` 과 같게 두고, 실패 SHA 가 현재 커밋이면 지운다.

```powershell
cd <저장소루트>
git rev-parse HEAD
git rev-parse origin/main
node scripts/mark-manual-deploy.mjs
```

`mark-manual-deploy.mjs` 가 하는 일:

1. `HEAD` 를 읽는다
2. `C:\nex\logs\deploy-failed-sha.txt` 내용이 `HEAD` 와 같으면 파일을 삭제한다
3. `C:\nex\logs\deploy.log` 에 `result=deployed`, `reason=manual_after_migration`, `to=<HEAD>` 한 줄을 추가한다
4. 터미널에는 로그 경로와 SHA 만 출력한다

확인:

```powershell
git rev-parse HEAD
git rev-parse origin/main
# 두 값이 같아야 한다
if (Test-Path C:\nex\logs\deploy-failed-sha.txt) { Get-Content C:\nex\logs\deploy-failed-sha.txt }
Get-Content C:\nex\logs\deploy.log -Tail 3
```

`deploy-failed-sha.txt` 가 없거나, 있어도 현재 `HEAD` 와 다르면 된다.

### 9. 자동 배포 다시 켜기

```powershell
Enable-ScheduledTask -TaskName NexGitAutoPull
Get-ScheduledTask -TaskName NexGitAutoPull | Select-Object TaskName, State
```

다음 주기 로그가 `skipped` / `no_new_commits` 이면 정상이다. `migration_manual_approval_required` 가 다시 나오면 `HEAD` 가 pull 되지 않은 것이다.

이 절차는 `C:\nex\deploy` 복사본을 고치지 않는다. `scripts/deploy-safe.mjs` 를 이 커밋에서 바꾸지 않았기 때문이다.

## 자동 배포 (NexGitAutoPull)

### 동작

- 작업: `\NexGitAutoPull` → `C:\nex\deploy\run-auto-deploy.ps1` → `C:\nex\deploy\deploy-safe.mjs`  
  (저장소 소스: `scripts/deploy-safe.mjs` / `scripts/server/*.ps1`. 실행본은 저장소 밖 `C:\nex\deploy` 복사본이다.)
- 대상 브랜치: 기본 `main` (`DEPLOY_BRANCH` 로 변경 가능)
- 매 실행: 잠금 → `git fetch` → 새 커밋 없으면 종료 → dirty면 거부 → 이전 실패 커밋과 같으면 스킵  
  → `apps/api/drizzle/` **신규 추가** 파일이 있으면 **배포 안 함** (수동 승인 필요)  
  → `git pull --ff-only` → `yarn install --immutable` → web/api 빌드 → API 단위 테스트  
  → 성공 시 `nssm restart nex-api` → `/api/health` 최대 60초 재시도  
  → 빌드 실패: 이전 커밋으로 되돌리고 재빌드, **API 재시작 없음**  
  → health 실패: 롤백 후 재빌드·API 재시작·health 확인
- 운영 DB에 붙는 e2e/스크립트 테스트는 실행하지 않는다.
- 작업 설정: 1분 간격, `MultipleInstances=IgnoreNew`, 스크립트 잠금 병행. RunLevel Highest(nssm용).

### 로그

```powershell
Get-Content C:\nex\logs\deploy.log -Tail 50
```

한 줄 JSON: `ts`, `branch`, `result`(`deployed`/`failed`/`rollback`/`skipped`), `from`/`to`, `reason`.  
실패·롤백·마이그레이션 대기는 `sendNotify` 로도 남긴다(현재 로그, 텔레그램은 토큰 있을 때만).

### 배포 스크립트 수동 복사

`C:\nex\deploy` 는 git 작업 폴더가 아니다. `main` 을 pull 해도 여기 파일은 바뀌지 않는다.  
`scripts/deploy-safe.mjs` 또는 `scripts/server/*.ps1` 을 수정한 뒤에는 **서버에 수동 복사**해야 다음 자동 배포부터 새 스크립트가 돈다.

| 저장소 | 서버 실행본 |
| --- | --- |
| `scripts/deploy-safe.mjs` | `C:\nex\deploy\deploy-safe.mjs` |
| `scripts/server/run-auto-deploy.ps1` | `C:\nex\deploy\run-auto-deploy.ps1` |
| `scripts/server/register-nex-auto-deploy.ps1` | 최초 등록용. 이미 작업이 있으면 다시 복사하지 않는다. |

서버 PowerShell (관리자):

```powershell
# 저장소루트 = 서버에서 git pull 하는 폴더 (예: C:\nex\app)
Copy-Item -Force <저장소루트>\scripts\deploy-safe.mjs C:\nex\deploy\deploy-safe.mjs
```

`run-auto-deploy.ps1` 은 실행본이 `$PSScriptRoot` 기준으로 루트를 계산한다. 저장소 파일을 그대로 덮어쓰면 경로가 어긋날 수 있으니, 내용을 확인한 뒤 복사한다.

복사만으로 `nex-api` 재시작은 필요 없다. 다음 `NexGitAutoPull` 주기부터 새 배포 스크립트가 실행된다.  
배포 스크립트를 고친 커밋을 보고할 때는 이 수동 복사가 필요하다고 적는다.

### 수동 배포

```powershell
cd <저장소루트>
$env:DEPLOY_BRANCH = 'main'
powershell -NoProfile -ExecutionPolicy Bypass -File C:\nex\deploy\run-auto-deploy.ps1
```

관리자 권한이 있어야 `nssm` 제어가 된다. 스케줄 작업은 Highest 로 등록돼 있다.

### 수동 롤백

```powershell
cd <저장소루트>
git fetch origin
git checkout --force <이전커밋SHA>
yarn install --immutable
yarn workspace web build
yarn workspace api build
nssm restart nex-api
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

### 자동 배포 끄기 / 켜기

```powershell
Disable-ScheduledTask -TaskName NexGitAutoPull
Enable-ScheduledTask -TaskName NexGitAutoPull
Get-ScheduledTask -TaskName NexGitAutoPull | Select-Object TaskName,State
```
