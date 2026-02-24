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
import { CardLinkService } from './card-link.service';
import { CardService } from '../card/card.service';
import { BoardService } from '../board/board.service';
import { CreateCardLinkDto } from './dto/create-card-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Card Links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CardLinkController {
  constructor(
    private readonly cardLinkService: CardLinkService,
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
  ) {}

  @Post('cards/:cardId/links')
  @ApiOperation({ summary: 'Create a link between cards' })
  @ApiParam({ name: 'cardId', description: 'Source card ID' })
  @ApiResponse({ status: 201, description: 'Card link created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Body() dto: CreateCardLinkDto,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.cardLinkService.create(cardId, dto.targetCardId, dto.linkType, user.id);
  }

  @Get('cards/:cardId/links')
  @ApiOperation({ summary: 'List all links for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of card links' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.cardLinkService.findByCardId(cardId);
  }

  @Delete('card-links/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a card link' })
  @ApiParam({ name: 'id', description: 'Card link ID' })
  @ApiResponse({ status: 200, description: 'Card link deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card link not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const sourceCardId = await this.cardLinkService.getSourceCardId(id);
    if (!sourceCardId) throw new ForbiddenException('Card link not found');
    await this.requireCardBoardRole(sourceCardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.cardLinkService.delete(id, user.id);
    return { message: 'Card link deleted successfully' };
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
