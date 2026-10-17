# 개발 문서

로컬 개발에 쓰는 구조, 환경 변수, API, 데이터베이스 절차를 정리한다.

## 디렉터리

| 경로 | 역할 |
| --- | --- |
| `apps/web` | 화면. Vite 개발 서버 포트는 5173 |
| `apps/api` | API. 전역 prefix는 `/api`, 기본 포트는 3000 |
| `apps/api/src/db/schema.ts` | Drizzle 스키마. 테이블은 이 파일에만 추가한다 |
| `apps/api/drizzle` | 생성된 마이그레이션 SQL |
| `docker-compose.yml` | 로컬 PostgreSQL만 실행한다 |

패키지 매니저는 Yarn 4다. 워크스페이스는 `apps/*`다.

## 환경 변수

예시는 커밋하고, `.env`는 커밋하지 않는다.

`apps/api/.env`

| 변수 | 로컬 값 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://app:app@localhost:5432/app` | PostgreSQL 접속 주소 |
| `PORT` | `3000` | API 수신 포트 |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS에서 허용할 화면 주소 |

`apps/web/.env`

| 변수 | 로컬 값 | 설명 |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | 화면의 API 기준 주소 |

화면의 Vite 설정은 `/api` 요청을 `http://localhost:3000`으로 프록시한다.

## 화면

- 함수 컴포넌트와 Tailwind 클래스만 사용한다.
- API 주소는 `import.meta.env.VITE_API_URL`을 사용한다.
- `BrowserRouter`로 앱을 감싼다.
- 현재 화면은 `GET /api/health` 결과를 한국어로 보여 준다.

## API

기능은 Module, Controller, Service로 나눈다. 요청 본문은 DTO와 `ValidationPipe`(`whitelist`, `transform`)로 검증한다. 데이터베이스 쿼리는 Service에서 `DbService`로만 실행한다.

`GET /api/health`는 `SELECT 1`을 실행하고 `{ "status": "ok" }`를 반환한다. 데이터베이스에 연결되지 않으면 이 요청은 실패한다.

`DbModule`은 전역 모듈이다. 프로세스 종료 시 PostgreSQL 연결을 닫는다.

## 데이터베이스

로컬 데이터베이스는 `docker compose up -d --wait`로 띄운다. 이미지는 `postgres:17`, 사용자·비밀번호·데이터베이스 이름은 모두 `app`, 포트는 `5432`다.

스키마를 변경한 뒤 아래 순서를 따른다.

```bash
yarn workspace api db:generate
yarn workspace api db:migrate
```

`drizzle-kit push`는 사용하지 않는다. 마이그레이션 SQL은 `apps/api/drizzle`에 커밋한다.

현재 스키마에는 테이블이 없다. 기능이 테이블을 필요로 할 때만 `apps/api/src/db/schema.ts`에 추가한다.

## 현재 구현

구현된 기능은 API 상태 확인뿐이다. 화면은 확인 중, 정상, 연결 실패를 한국어로 표시한다.
