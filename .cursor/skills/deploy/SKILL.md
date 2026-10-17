---
name: deploy
description: Adds the production Docker build for the Vite app, NestJS API, and PostgreSQL, then runs yarn docker:build. Use when the user runs /deploy or asks for the production Docker image.
disable-model-invocation: true
---

# 배포 이미지

배포 파일이 이미 있으면 수정하지 말고 `yarn docker:build`만 실행한다. 없을 때만 아래 파일을 만든다. 컨테이너는 띄우지 않는다. 로컬 개발용 `docker-compose.yml`과 `/setup` 절차는 바꾸지 않는다.

## 명령

루트 `package.json` scripts에 추가한다.

- `docker:build`: `docker compose -f docker-compose.prod.yml build`
- `docker:up`: `docker compose -f docker-compose.prod.yml up -d`

## 파일

빌드 context는 저장소 루트다. 화면 Dockerfile은 `apps/web/Dockerfile`, API Dockerfile은 `apps/api/Dockerfile`이다.

화면 이미지는 `yarn workspace web build` 결과만 nginx에 담는다. Vite 개발 서버는 넣지 않는다. 빌드 인자 `VITE_API_URL` 기본값은 `/api`다. nginx는 `/api/`를 `http://api:3000`으로 프록시하고, 나머지 경로는 `index.html`로 보낸다.

API 이미지는 `yarn workspace api build` 결과를 담는다. 시작 스크립트는 `yarn workspace api db:migrate`를 실행한 뒤 `node apps/api/dist/main.js`를 실행한다. 마이그레이션에 필요한 `drizzle-kit`과 `apps/api/drizzle`을 이미지에 포함한다.

`docker-compose.prod.yml` 서비스:

- `postgres`: `postgres:17`. 호스트 포트는 열지 않는다. 데이터 볼륨과 `pg_isready` healthcheck를 둔다.
- `api`: PostgreSQL이 정상이 된 뒤 시작한다. `DATABASE_URL` 호스트는 `postgres`다.
- `web`: 호스트 `8080`을 컨테이너 `80`에 연결한다.

루트 `.env.production.example`:

```
POSTGRES_USER=app
POSTGRES_PASSWORD=change-me
POSTGRES_DB=app
WEB_ORIGIN=http://localhost:8080
```

Compose는 이 파일을 env 파일로 읽는다. `.env.production`이 없으면 example을 복사한다. 루트 `.gitignore`에 `!.env.production.example`이 없으면 추가한다. `.env.production`은 커밋하지 않는다.

## 실행

Docker가 없으면 빌드를 멈추고, Docker Desktop을 켠 뒤 `/deploy`를 다시 실행하라고 한국어로 알린다.

Docker가 있으면 `yarn docker:build`를 실행한다. 완료 후 서버에서 `yarn docker:up`을 실행하면 `http://localhost:8080`에서 확인할 수 있다고 알린다.
