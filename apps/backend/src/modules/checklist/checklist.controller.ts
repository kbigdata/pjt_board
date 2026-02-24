import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ChecklistService } from './checklist.service';
import { CardService } from '../card/card.service';
import { BoardService } from '../board/board.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChecklistController {
  constructor(
    private readonly checklistService: ChecklistService,
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
  ) {}

  @Post('cards/:cardId/checklists')
  @ApiOperation({ summary: 'Create checklist on card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Checklist created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.checklistService.create(cardId, dto);
  }

  @Get('cards/:cardId/checklists')
  @ApiOperation({ summary: 'List checklists on card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of checklists with items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.checklistService.findAllByCardId(cardId);
  }

  @Patch('checklists/:id')
  @ApiOperation({ summary: 'Update checklist title' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateChecklistDto,
  ) {
    await this.requireChecklistBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.checklistService.update(id, dto);
  }

  @Delete('checklists/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete checklist' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({ status: 200, description: 'Checklist deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireChecklistBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.checklistService.delete(id);
    return { message: 'Checklist deleted successfully' };
  }

  @Post('checklists/:id/items')
  @ApiOperation({ summary: 'Add item to checklist' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({ status: 201, description: 'Item added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async addItem(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    await this.requireChecklistBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.checklistService.addItem(id, dto);
  }

  @Patch('checklist-items/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle checklist item checked state' })
  @ApiParam({ name: 'itemId', description: 'Checklist item ID' })
  @ApiResponse({ status: 200, description: 'Item toggled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async toggleItem(
    @CurrentUser() user: { id: string },
    @Param('itemId') itemId: string,
  ) {
    await this.requireItemBoardRole(itemId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.checklistService.toggleItem(itemId);
  }

  @Delete('checklist-items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete checklist item' })
  @ApiParam({ name: 'itemId', description: 'Checklist item ID' })
  @ApiResponse({ status: 200, description: 'Item deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async removeItem(
    @CurrentUser() user: { id: string },
    @Param('itemId') itemId: string,
  ) {
    await this.requireItemBoardRole(itemId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.checklistService.deleteItem(itemId);
    return { message: 'Checklist item deleted successfully' };
  }

  private async requireCardBoardAccess(cardId: string, userId: string) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) throw new ForbiddenException('You are not a member of this board');
    return role;
  }

  private async requireCardBoardRole(cardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireCardBoardAccess(cardId, userId);
    if (!allowed.includes(role)) throw new ForbiddenException('Insufficient permissions');
    return role;
  }

  private async requireChecklistBoardRole(checklistId: string, userId: string, allowed: Role[]) {
    const cardId = await this.checklistService.getCardId(checklistId);
    if (!cardId) throw new ForbiddenException('Checklist not found');
    return this.requireCardBoardRole(cardId, userId, allowed);
  }

  private async requireItemBoardRole(itemId: string, userId: string, allowed: Role[]) {
    const cardId = await this.checklistService.getCardIdFromItem(itemId);
    if (!cardId) throw new ForbiddenException('Checklist item not found');
    return this.requireCardBoardRole(cardId, userId, allowed);
  }
}
