# 앱

TypeScript 모노레포다. 화면은 Vite와 React, API는 NestJS, 데이터베이스는 PostgreSQL과 Drizzle을 사용한다.

## 요구 사항

- Node.js 22.12.0 이상
- Yarn 4.18.1 (`packageManager` 필드)
- 로컬 PostgreSQL용 Docker Desktop

## 시작

의존성이 없으면 루트에서 설치한다.

```bash
yarn install
```

환경 파일이 없으면 예시를 복사한다.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

PostgreSQL을 띄운다.

```bash
docker compose up -d --wait
```

스키마를 바꾼 뒤에는 마이그레이션을 만들고 적용한다. 자세한 순서는 [개발 문서](docs/development.md)에 있다.

```bash
yarn workspace api db:generate
yarn workspace api db:migrate
```

처음 한 번은 예시 데이터를 넣는다. 이미 있으면 건너뛴다.

```bash
yarn workspace api db:seed
```

개발 서버를 켠다.

```bash
yarn dev
```

Windows 명령 프롬프트에서는 `dev.cmd`를 실행한다. 한글 폴더 경로가 깨지지 않도록 코드 페이지를 UTF-8로 바꾸고, PostgreSQL을 띄운 뒤 `yarn dev`를 실행한다.

- 회원 사이트: http://localhost:5173 (`/login`)
- 관리자 콘솔: http://localhost:5173/admin (`/admin/login`)
- API: http://localhost:3000/api/health
- 첫 관리자 계정은 `apps/api/.env`의 `ADMIN_USERNAME`, `ADMIN_PASSWORD`로 API가 켜질 때 만들어진다.
- 예시 회원: `user1` / `user1234!`, `user2` / `user1234!`
- 로컬 테스트 계정: `test` / `test` (API가 켜질 때 맞춘다)
- API 주소와 데이터 모양은 [API 계약](docs/API.md)에 있다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `yarn dev` | 화면과 API를 함께 실행 |
| `yarn dev:web` | 화면만 실행 |
| `yarn dev:api` | API만 실행 |
| `yarn workspace api db:seed` | 예시 리그·경기·회원·글 넣기 |
| `yarn workspace api test:e2e` | API 통합 테스트. 실행 중인 PostgreSQL이 필요하다 |

## 구성

```
apps/web    Vite, React, TypeScript, react-router, Tailwind CSS
apps/api    NestJS, Drizzle, PostgreSQL
```
