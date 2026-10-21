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

자동 배포 작업(`NexGitAutoPull`)은 `scripts/deploy-safe.mjs` 를 1분마다 호출한다.  
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

## 자동 배포 (NexGitAutoPull)

### 동작

- 작업: `\NexGitAutoPull` → `scripts/server/run-auto-deploy.ps1` → `scripts/deploy-safe.mjs`
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

### 수동 배포

```powershell
cd <저장소루트>
$env:DEPLOY_BRANCH = 'main'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\server\run-auto-deploy.ps1
```

관리자 권한이 있어야 `nssm restart` 가 된다. 스케줄 작업은 Highest 로 등록돼 있다.

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
