프로젝트 초기 셋업을 실행합니다.

## 실행 순서

### Step 1: 의존성 설치
```bash
pnpm install
```

### Step 2: 환경 변수 설정
.env.example을 .env로 복사하고, 필요한 값을 설정하세요.

### Step 3: Docker 인프라 시작
```bash
pnpm docker:dev
```

### Step 4: 데이터베이스 마이그레이션
```bash
pnpm db:migrate
```

### Step 5: 시드 데이터 (선택)
```bash
pnpm db:seed
```

### Step 6: 개발 서버 시작
```bash
pnpm dev
```

각 단계 실행 결과를 확인하고 보고하세요.
