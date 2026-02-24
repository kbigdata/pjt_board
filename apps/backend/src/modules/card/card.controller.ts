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
import { CardService } from './card.service';
import { BoardService } from '../board/board.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { CopyCardDto } from './dto/copy-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BoardGateway } from '../board/board.gateway';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
    private readonly boardGateway: BoardGateway,
  ) {}

  @Post('boards/:boardId/cards')
  @ApiOperation({ summary: 'Create a new card in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Card created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board or column not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateCardDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const card = await this.cardService.createForUser(boardId, user.id, dto);
    this.boardGateway.emitCardCreated(boardId, user.id, card as unknown as Record<string, unknown>);
    return card;
  }

  @Get('boards/:boardId/cards')
  @ApiOperation({ summary: 'List cards in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of cards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAllInBoard(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.cardService.findAllByBoardId(boardId);
  }

  @Get('boards/:boardId/cards/archived')
  @ApiOperation({ summary: 'List archived cards in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of archived cards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findArchivedInBoard(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.cardService.findArchivedByBoardId(boardId);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Get card details' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireCardBoardAccess(id, user.id);
    return this.cardService.findById(id);
  }

  @Patch('cards/:id')
  @ApiOperation({ summary: 'Update card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const card = await this.cardService.update(id, dto);
    const boardId = await this.cardService.getBoardId(id);
    if (boardId) this.boardGateway.emitCardUpdated(boardId, user.id, card as unknown as Record<string, unknown>);
    return card;
  }

  @Patch('cards/:id/move')
  @ApiOperation({ summary: 'Move card to column/position' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card moved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async move(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: MoveCardDto,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const existing = await this.cardService.findById(id);
    const card = await this.cardService.move(id, dto);
    const boardId = await this.cardService.getBoardId(id);
    if (boardId) this.boardGateway.emitCardMoved(boardId, user.id, card as unknown as Record<string, unknown>, existing.columnId);
    return card;
  }

  @Post('cards/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async archive(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.cardService.getBoardId(id);
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const card = await this.cardService.archive(id);
    if (boardId) this.boardGateway.emitCardArchived(boardId, user.id, id);
    return card;
  }

  @Post('cards/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card restored' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async restore(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.cardService.restore(id);
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete card (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    await this.cardService.delete(id);
    return { message: 'Card deleted successfully' };
  }

  // ── Copy ──

  @Post('cards/:id/copy')
  @ApiOperation({ summary: 'Copy card with labels, tags, and checklists' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Card copied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card or column not found' })
  async copy(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CopyCardDto,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.cardService.copy(id, user.id, dto.targetColumnId);
  }

  // ── Assignee management ──

  @Post('cards/:id/assignees/:userId')
  @ApiOperation({ summary: 'Add assignee to card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiParam({ name: 'userId', description: 'User ID to assign' })
  @ApiResponse({ status: 201, description: 'Assignee added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card or user not found' })
  async addAssignee(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const result = await this.cardService.addAssignee(id, userId);
    const boardId = await this.cardService.getBoardId(id);
    const card = await this.cardService.findById(id);
    if (boardId) {
      this.boardGateway.emitCardAssigned(boardId, user.id, userId, card as unknown as Record<string, unknown>);
    }
    return result;
  }

  @Delete('cards/:id/assignees/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove assignee from card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiParam({ name: 'userId', description: 'User ID to unassign' })
  @ApiResponse({ status: 200, description: 'Assignee removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Assignee not found' })
  async removeAssignee(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.requireCardBoardRole(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.cardService.removeAssignee(id, userId);
    return { message: 'Assignee removed successfully' };
  }

  // ── Helpers ──

  private async requireBoardMembership(boardId: string, userId: string) {
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this board');
    }
    return role;
  }

  private async requireBoardRole(boardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireBoardMembership(boardId, userId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
  }

  private async requireCardBoardAccess(cardId: string, userId: string) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    return this.requireBoardMembership(boardId, userId);
  }

  private async requireCardBoardRole(cardId: string, userId: string, allowed: Role[]) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    return this.requireBoardRole(boardId, userId, allowed);
  }
}
