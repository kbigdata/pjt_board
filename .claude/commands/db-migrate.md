DB 마이그레이션을 실행합니다.

## 입력
$ARGUMENTS 에서 마이그레이션 이름을 받습니다 (선택).

## 실행 순서

### Step 1: 스키마 확인
apps/backend/prisma/schema.prisma의 변경사항을 확인하세요.

### Step 2: 마이그레이션 생성 및 실행
```bash
pnpm db:migrate
```
마이그레이션 이름이 주어지면 --name 옵션으로 전달합니다.

### Step 3: 검증
- 마이그레이션 성공 여부 확인
- Prisma Client 재생성 확인
- 기존 테스트 통과 여부 확인

**주의**: 반드시 개발 DB(:5433)에서만 실행하세요. 운영 DB(:5432)에 직접 실행하지 마세요.
