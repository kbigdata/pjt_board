개발 서버를 시작합니다.

## 실행 순서

### Step 1: Docker 인프라 확인
Docker 개발 컨테이너(PostgreSQL, Redis, MinIO)가 실행 중인지 확인하세요.
실행 중이 아니면:
```bash
pnpm docker:dev
```

### Step 2: 개발 서버 시작
```bash
pnpm dev
```

Frontend: http://localhost:3000
Backend: http://localhost:4000
Swagger: http://localhost:4000/api/docs
