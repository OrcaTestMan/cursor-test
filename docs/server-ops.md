# ?쒕쾭 ?댁쁺 硫붾え (211.110.16.130)

Windows ?쒕쾭?먯꽌 Nest API쨌Docker Postgres瑜??곸떆 ?댁쁺?????곕뒗 ?먭?쨌蹂듦뎄 ?덉감??  
鍮꾨?踰덊샇쨌`.env` ?댁슜? ??臾몄꽌???곸? ?딅뒗??

## 援ъ꽦 ?붿빟

| 援ъ꽦 | 媛?|
| --- | --- |
| API ?쒕퉬??| Windows ?쒕퉬??`nex-api` (NSSM), ?쒖옉 ?좏삎 ?먮룞 |
| API ?ㅽ뻾 | `node dist/main.js`, ?묒뾽 ?대뜑 `apps/api` |
| API 濡쒓렇 | `C:\nex\logs\nex-api.out.log`, `C:\nex\logs\nex-api.err.log` (??10MB ?뚯쟾) |
| Postgres 而⑦뀒?대꼫 | `nex-postgres-clean` (`postgres:17.11`) |
| Postgres ?ы듃 | `127.0.0.1:5432` 留?|
| 而⑦뀒?대꼫 restart | `unless-stopped` |
| ?쒗겕由?| `C:\backups\live-secrets\` (git 湲덉?) |
| ?ш퀬 利앷굅 | `C:\backups\incident-20261021\` (蹂듭썝 湲덉?) |

?먮룞 諛고룷 ?묒뾽(`NexGitAutoPull`)? `scripts/deploy-safe.mjs` 瑜?1遺꾨쭏???몄텧?쒕떎.  
?꾨줎?몄뿏??Vite) ?꾩슜 Windows ?쒕퉬?ㅻ뒗 ?녿떎. ?쒕쾭??`nex-api`(3000)留?NSSM?쇰줈 ?곸떆 ?ㅽ뻾?섎ŉ, 諛고룷 ??web쨌api ????鍮뚮뱶?섏?留??ъ떆?묒? API留??쒕떎.

## ?щ?????蹂듦뎄 ?쒖꽌

1. **濡쒓렇??*  
   RDP(3389)濡??쒕쾭??濡쒓렇?명븳?? (諛⑺솕踰쎌뿉??3389???좎?)

2. **Docker ?ㅽ뻾 ?뺤씤**  
   - ?쒖뒪???몃젅?댁뿉 Docker Desktop?????덈뒗吏 蹂몃떎.  
   - PowerShell: `docker info` 媛 ?먮윭 ?놁씠 ?묐떟?섎뒗吏 ?뺤씤?쒕떎.  
   - ???섎㈃ Docker Desktop???섎룞 ?ㅽ뻾?????붿쭊?????뚭퉴吏 湲곕떎由곕떎.

3. **`nex-postgres-clean` ?곹깭**  
   ```powershell
   docker ps --filter name=nex-postgres-clean
   docker inspect nex-postgres-clean --format "Status={{.State.Status}} Health={{.State.Health.Status}} Restart={{.HostConfig.RestartPolicy.Name}}"
   ```  
   - 湲곕?: `Up` + `healthy`, Restart=`unless-stopped`  
   - 以묒??섏뼱 ?덉쑝硫? `docker start nex-postgres-clean`

4. **`nex-api` ?곹깭**  
   ```powershell
   Get-Service nex-api
   nssm status nex-api
   ```  
   - 湲곕?: `Running`  
   - 以묒??섏뼱 ?덉쑝硫? `nssm start nex-api` ?먮뒗 `Start-Service nex-api`  
   - API媛 DB蹂대떎 癒쇱? ?좎꽌 ?ㅽ뙣?덉뼱??NSSM????5珥?媛꾧꺽?쇰줈 ?ъ떆?묓븳?? Postgres healthy ?댄썑 health媛 遺숇뒗吏 ?뺤씤?쒕떎.

5. **health ?뺤씤**  
   ```powershell
   Invoke-RestMethod http://127.0.0.1:3000/api/health
   ```  
   - 湲곕?: `{ "status": "ok", "db": "up" }`

## ?쒕퉬??愿由?紐낅졊

NSSM 寃쎈줈??winget ?ㅼ튂 ?꾩튂???덉쓣 ???덈떎. `nssm` ??PATH???덉쑝硫?洹몃?濡??대떎.

```text
?쒖옉:     nssm start nex-api
以묒?:     nssm stop nex-api
?ъ떆??   nssm restart nex-api
?곹깭:     nssm status nex-api
```

?먮뒗:

```powershell
Start-Service nex-api
Stop-Service nex-api
Restart-Service nex-api
Get-Service nex-api
```

## 濡쒓렇 ?꾩튂

- ?쒖? 異쒕젰: `C:\nex\logs\nex-api.out.log`
- ?쒖? ?먮윭: `C:\nex\logs\nex-api.err.log`
- ?뚯쟾: NSSM `AppRotateFiles` / `AppRotateOnline` / `AppRotateBytes=10485760`

## Docker / compose

?쒕쾭???뚯씪? `docker-compose.server.yml` ?대떎. (`name: nex-clean` 怨좎젙)  
PC 濡쒖뺄 媛쒕컻??`docker-compose.yml` 怨??욎? ?딅뒗??

- ?대?吏: `postgres:17.11`
- 而⑦뀒?대꼫: `nex-postgres-clean`
- `restart: unless-stopped`
- ?ы듃: `127.0.0.1:5432:5432`
- env ?뚯씪: `C:/backups/live-secrets/postgres.env` (git 諛?
- 蹂쇰ⅷ: `nex_pg_clean_20261021`

?쒕쾭?먯꽌 compose 紐낅졊? ??긽 `-f docker-compose.server.yml` ??遺숈씤??  
?꾨줈?앺듃 ?대쫫 `nex-clean` ? ?뚯씪??`name:` ?쇰줈 ?좎??섎?濡?湲곗〈 而⑦뀒?대꼫瑜??덈줈 留뚮뱾吏 ?딅뒗??

```powershell
cd <??μ냼猷⑦듃>
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml up -d --wait
```

## ?섎룎由ш린

### nex-api ?쒕퉬???쒓굅

```text
nssm stop nex-api
nssm remove nex-api confirm
```

?꾩슂?섎㈃ ?댄썑 ?섎룞?쇰줈 `yarn workspace api start:prod` 瑜??대떎.

### 而⑦뀒?대꼫 restart ?뺤콉 ?섎룎由ш린

```powershell
docker update --restart=no nex-postgres-clean
```

`docker-compose.server.yml` ??`restart: unless-stopped` 以꾨룄 ?쒓굅?섍굅??`no` 濡?諛붽씔??

### Docker ?먮룞 ?쒖옉 ?섎룎由ш린

- Docker Desktop ?ㅼ젙?먯꽌 Start Docker Desktop when you log in ?댁젣, ?먮뒗  
  `%APPDATA%\Docker\settings-store.json` ??`AutoStart` 瑜?`false`
- `Set-Service com.docker.service -StartupType Manual`

### Windows Update ?먮룞 ?щ???諛⑹? ?섎룎由ш린

愿由ъ옄 PowerShell:

```powershell
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name NoAutoRebootWithLoggedOnUsers -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name AUOptions -ErrorAction SilentlyContinue
# ?쒖꽦 ?쒓컙? ?ㅼ젙 ??> Windows Update > ?쒖꽦 ?쒓컙?먯꽌 ?섎룞 議곗젙
```

## 肄붾뱶 諛섏쁺

?쒕쾭 ?묒뾽 ?대뜑???됱냼 `main` ???좎??쒕떎.  
`.env`, `C:\backups\` ?쒗겕由온룹쬆嫄곕뒗 ?덈? 而ㅻ컠?섏? ?딅뒗??

## ?먮룞 諛고룷 (NexGitAutoPull)

### ?숈옉

- ?묒뾽: `\NexGitAutoPull` ??`scripts/server/run-auto-deploy.ps1` ??`scripts/deploy-safe.mjs`
- ???釉뚮옖移? 湲곕낯 `main` (`DEPLOY_BRANCH` 濡?蹂寃?媛??
- 留??ㅽ뻾: ?좉툑 ??`git fetch` ????而ㅻ컠 ?놁쑝硫?醫낅즺 ??dirty硫?嫄곕? ???댁쟾 ?ㅽ뙣 而ㅻ컠怨?媛숈쑝硫??ㅽ궢  
  ??`apps/api/drizzle/` **?좉퇋 異붽?** ?뚯씪???덉쑝硫?**諛고룷 ????* (?섎룞 ?뱀씤 ?꾩슂)  
  ??`git pull --ff-only` ??`yarn install --immutable` ??web/api 鍮뚮뱶 ??API ?⑥쐞 ?뚯뒪?? 
  ???깃났 ??`nssm restart nex-api` ??`/api/health` 理쒕? 60珥??ъ떆?? 
  ??鍮뚮뱶 ?ㅽ뙣: ?댁쟾 而ㅻ컠?쇰줈 ?섎룎由ш퀬 ?щ퉴?? **API ?ъ떆???놁쓬**  
  ??health ?ㅽ뙣: 濡ㅻ갚 ???щ퉴?쑣텮PI ?ъ떆?뫢톒ealth ?뺤씤
- ?댁쁺 DB??遺숇뒗 e2e/?ㅽ겕由쏀듃 ?뚯뒪?몃뒗 ?ㅽ뻾?섏? ?딅뒗??
- ?묒뾽 ?ㅼ젙: 1遺?媛꾧꺽, `MultipleInstances=IgnoreNew`, ?ㅽ겕由쏀듃 ?좉툑 蹂묓뻾. RunLevel Highest(nssm??.

### 濡쒓렇

```powershell
Get-Content C:\nex\logs\deploy.log -Tail 50
```

??以?JSON: `ts`, `branch`, `result`(`deployed`/`failed`/`rollback`/`skipped`), `from`/`to`, `reason`.  
?ㅽ뙣쨌濡ㅻ갚쨌留덉씠洹몃젅?댁뀡 ?湲곕뒗 `sendNotify` 濡쒕룄 ?④릿???꾩옱 濡쒓렇, ?붾젅洹몃옩? ?좏겙 ?덉쓣 ?뚮쭔).

### ?섎룞 諛고룷

```powershell
cd <??μ냼猷⑦듃>
$env:DEPLOY_BRANCH = 'main'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\server\run-auto-deploy.ps1
```

愿由ъ옄 沅뚰븳???덉뼱??`nssm restart` 媛 ?쒕떎. ?ㅼ?以??묒뾽? Highest 濡??깅줉???덈떎.

### ?섎룞 濡ㅻ갚

```powershell
cd <??μ냼猷⑦듃>
git fetch origin
git checkout --force <?댁쟾而ㅻ컠SHA>
yarn install --immutable
yarn workspace web build
yarn workspace api build
nssm restart nex-api
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

### ?먮룞 諛고룷 ?꾧린 / 耳쒓린

```powershell
Disable-ScheduledTask -TaskName NexGitAutoPull
Enable-ScheduledTask -TaskName NexGitAutoPull
Get-ScheduledTask -TaskName NexGitAutoPull | Select-Object TaskName,State
```

