import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CardTagService } from './card-tag.service';
import { CardService } from '../card/card.service';
import { BoardService } from '../board/board.service';
import { CreateCardTagDto } from './dto/create-card-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Card Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CardTagController {
  constructor(
    private readonly cardTagService: CardTagService,
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
  ) {}

  @Post('cards/:cardId/tags')
  @ApiOperation({ summary: 'Add tag to card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Tag added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async addTag(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Body() dto: CreateCardTagDto,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.cardTagService.addTag(cardId, dto.tag);
  }

  @Get('cards/:cardId/tags')
  @ApiOperation({ summary: 'List tags on card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.cardTagService.findByCardId(cardId);
  }

  @Delete('cards/:cardId/tags/:tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove tag from card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiParam({ name: 'tag', description: 'Tag value to remove' })
  @ApiResponse({ status: 200, description: 'Tag removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async removeTag(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Param('tag') tag: string,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.cardTagService.removeTag(cardId, tag);
    return { message: 'Tag removed successfully' };
  }

  // ── Helpers ──

  private async requireCardBoardAccess(cardId: string, userId: string) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) throw new ForbiddenException('You are not a member of this board');
    return role;
  }

  private async requireCardBoardRole(cardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireCardBoardAccess(cardId, userId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
  }
}
