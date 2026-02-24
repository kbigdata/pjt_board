---
name: api-endpoint
description: >
  REST API 엔드포인트를 구현할 때 사용.
  KanFlow 프로젝트의 NestJS 패턴(Swagger, JWT, DTO)에 맞게
  Controller, Service, DTO를 생성한다.
---

# REST API 엔드포인트 패턴

## URL 규칙
```
/api/workspaces
/api/workspaces/:workspaceId/boards
/api/boards/:boardId/columns
/api/boards/:boardId/swimlanes
/api/columns/:columnId/cards
/api/cards/:cardId/comments
/api/cards/:cardId/attachments
/api/cards/:cardId/checklists
```

## Controller 패턴
```typescript
@ApiTags('cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get(':id')
  @ApiOperation({ summary: '카드 상세 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardService.findOne(id);
  }
}
```

## DTO 패턴
```typescript
export class CreateCardDto {
  @ApiProperty({ description: '카드 제목' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCardDto extends PartialType(CreateCardDto) {}
```

## 응답 패턴
- 성공: 엔티티 직접 반환 (별도 Response DTO 없음)
- 에러: NestJS HttpException 계층 사용
- 페이지네이션: `{ data: T[], total: number, page: number, limit: number }`
