---
name: prisma-migration
description: >
  Prisma 스키마 변경 및 마이그레이션을 수행할 때 사용.
  KanFlow 프로젝트의 DB 규칙(fractional indexing, soft delete 등)에 맞게
  스키마를 수정하고 마이그레이션을 실행한다.
---

# Prisma 마이그레이션 패턴

## 스키마 규칙
- 모델명: PascalCase (Card, Column, Swimlane)
- 테이블명: snake_case 복수형 (`@@map("cards")`)
- 필드명: camelCase, DB 컬럼은 snake_case (`@map("created_at")`)
- ID: UUID (`@id @default(uuid())`)
- 타임스탬프: `createdAt`, `updatedAt` 필수

## Position 필드 (Fractional Indexing)
- 타입: `Float`
- 기본값: `@default(0)`
- 새 아이템 위치: `(posA + posB) / 2`
- 정밀도 0.001 미만 시 자동 리밸런싱

## Soft Delete
- `archivedAt DateTime?` 필드 사용
- 삭제 대신 아카이브 (Card, Column, Board 등)

## 마이그레이션 실행
```bash
# 개발 DB (항상 이것부터!)
cd apps/backend && npx prisma migrate dev --name <migration-name>

# 운영 DB (배포 시에만)
DATABASE_URL="...prod..." npx prisma migrate deploy
```

## 주의사항
- 반드시 개발 DB(:5433)에서 먼저 테스트
- 운영 DB(:5432)에 직접 migrate dev 실행 금지
- 데이터 손실 가능한 변경은 별도 마이그레이션으로 분리
