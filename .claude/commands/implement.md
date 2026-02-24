설계서 기반으로 코드를 구현합니다.

## 입력
$ARGUMENTS 에서 구현할 기능 또는 ADR 문서 경로를 받습니다.

## 실행 순서

### Step 1: 설계서 확인
docs/adr/ 디렉토리에서 관련 설계 문서를 읽으세요.

### Step 2: 구현
implementer 서브에이전트를 사용하여 설계서에 따라 구현하세요.
구현 순서:
1. packages/shared 타입 정의
2. Prisma 스키마 + 마이그레이션
3. Backend (Service → Controller → DTO → Test)
4. Frontend (API → Hook → Component → Test)

### Step 3: 리뷰
reviewer 서브에이전트를 사용하여 구현 코드를 리뷰하세요.

### Step 4: 검증
- pnpm test 실행
- pnpm lint 실행
- 결과 보고
