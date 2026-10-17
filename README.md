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

개발 서버를 켠다.

```bash
yarn dev
```

- 화면: http://localhost:5173
- API: http://localhost:3000/api/health

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `yarn dev` | 화면과 API를 함께 실행 |
| `yarn dev:web` | 화면만 실행 |
| `yarn dev:api` | API만 실행 |

## 구성

```
apps/web    Vite, React, TypeScript, react-router, Tailwind CSS
apps/api    NestJS, Drizzle, PostgreSQL
```
