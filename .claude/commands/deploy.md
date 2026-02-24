운영 환경에 배포합니다.

## 실행 순서

### Step 1: 사전 검증
- git status로 uncommitted changes 확인
- pnpm test 실행하여 전체 테스트 통과 확인
- pnpm lint 실행하여 린트 이슈 없음 확인

### Step 2: 빌드
```bash
pnpm build
```

### Step 3: 운영 DB 마이그레이션
```bash
pnpm db:migrate:prod
```

### Step 4: 운영 컨테이너 재시작
```bash
pnpm docker:prod
```

### Step 5: 검증
- 운영 서버 헬스체크
- 주요 API 엔드포인트 응답 확인

**주의**: 배포 전 반드시 사용자 승인을 받으세요.
