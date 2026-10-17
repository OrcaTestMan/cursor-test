# 데이터베이스 (Neon)

## 프로젝트 (대표님 Neon 콘솔 기준)

| 항목 | 값 |
|------|-----|
| Neon 프로젝트 이름 | test |
| Project ID | sweet-wildflower-55943632 |
| 기본 브랜치 | production |
| 리전 | AWS Asia Pacific 1 (Singapore) |
| 플랜 | Free |

비밀번호·Connection URI는 **`.env`만** 보관한다. GitHub·채팅에 붙이지 않는다.

## 로컬 연결

1. Neon → **Connect** → Branch **production** → **Connection string** (URI) 복사
2. 프로젝트 루트에 `.env` 생성 (`.env.example` 참고)
3. `DATABASE_URL=` 에 URI 붙여넣기

## Cursor Agent (Neon MCP)

프로젝트 루트에서 (Neon 대시보드 **Onboard your agent → Copy command** 와 동일할 수 있음):

```cmd
npx neon@latest init
```

또는 Cursor만:

```cmd
npx neon@latest mcp --oauth --project --agent cursor
```

완료 후 Cursor 재시작 → Settings → Tools & MCP 에 Neon 확인.

프로젝트에 `.cursor/mcp.json`(OAuth, API 키 없음)이 있으면 재설치 없이 사용 가능. 첫 MCP 사용 시 Neon 로그인 창이 뜬다.

## SQL 확인

Neon Console → SQL Editor:

```sql
SELECT version();
```

## dev / prod

초기에는 `production` 브랜치 하나로 개발 가능.  
운영 전에는 Neon **Branches**에서 `dev` 자식 브랜치를 만들어 실험용으로 쓰는 것을 권장한다.
