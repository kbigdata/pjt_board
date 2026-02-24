---
name: nestjs-module
description: >
  NestJS 모듈, 컨트롤러, 서비스를 생성할 때 사용.
  Module, Controller, Service, DTO 파일을 KanFlow 프로젝트의
  패턴에 맞게 생성한다.
---

# NestJS 모듈 생성 패턴

## 파일 구조
```
apps/backend/src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.gateway.ts          (WebSocket 필요 시)
└── dto/
    ├── create-<name>.dto.ts
    └── update-<name>.dto.ts
```

## Controller 패턴
- 모든 엔드포인트에 `@ApiTags`, `@ApiOperation`, `@ApiResponse`
- `@UseGuards(JwtAuthGuard)` 적용
- DTO로 입력 유효성 검증
- Response는 서비스 반환값 직접 반환 (별도 변환 레이어 없음)

## Service 패턴
- constructor에 PrismaService 주입
- 모든 public 메서드에 대한 단위 테스트
- 트랜잭션은 prisma.$transaction() 사용
- 에러는 NotFoundException, BadRequestException 등 적절한 HttpException

## DTO 패턴
- class-validator 데코레이터 사용
- @IsString(), @IsOptional(), @MaxLength() 등
- PartialType(CreateDto)로 UpdateDto 생성
