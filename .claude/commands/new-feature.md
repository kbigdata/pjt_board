새 기능 개발 전체 파이프라인을 실행합니다.

## 입력
$ARGUMENTS 에서 기능 설명을 받습니다.

## 실행 순서

### Step 1: 조사 (Researcher Subagent)
researcher 서브에이전트를 사용하여 기존 코드베이스에서 관련 패턴을 분석하세요.
- 관련 기존 코드 파악
- 영향 범위 분석
- 유사 기능 구현 패턴 확인

### Step 2: 설계 (Architect Subagent)
architect 서브에이전트를 사용하여 기능을 설계하세요.
조사 결과를 전달하여:
- API 엔드포인트 설계
- DB 스키마 변경사항 설계
- 프론트 컴포넌트 구조 설계
- ADR 문서 작성 → docs/adr/ 에 저장

### Step 3: 확인
설계 결과를 나에게 보여주고 승인을 기다리세요.
승인 전까지 구현하지 마세요.

### Step 4: 구현 (승인 후)
implementer 서브에이전트를 사용하여 코드를 구현하세요.
구현 순서:
1. packages/shared 타입 정의
2. Prisma 스키마 + 마이그레이션
3. Backend (Service → Controller → DTO → Test)
4. Frontend (API → Hook → Component → Test)

### Step 5: 리뷰
reviewer 서브에이전트를 사용하여 구현된 코드를 리뷰하세요.
Critical 이슈가 있으면 수정 후 다시 리뷰.

### Step 6: 최종 확인
- pnpm test 실행
- pnpm lint 실행
- 결과 보고
