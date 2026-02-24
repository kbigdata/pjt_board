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
import { LabelService } from './label.service';
import { BoardService } from '../board/board.service';
import { CardService } from '../card/card.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LabelController {
  constructor(
    private readonly labelService: LabelService,
    private readonly boardService: BoardService,
    private readonly cardService: CardService,
  ) {}

  @Post('boards/:boardId/labels')
  @ApiOperation({ summary: 'Create label for board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Label created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateLabelDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.labelService.create(boardId, dto);
  }

  @Get('boards/:boardId/labels')
  @ApiOperation({ summary: 'List labels in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of labels' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.labelService.findAllByBoardId(boardId);
  }

  @Patch('labels/:id')
  @ApiOperation({ summary: 'Update label' })
  @ApiParam({ name: 'id', description: 'Label ID' })
  @ApiResponse({ status: 200, description: 'Label updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    const boardId = await this.labelService.getBoardId(id);
    if (!boardId) throw new ForbiddenException('Label not found');
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.labelService.update(id, dto);
  }

  @Delete('labels/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete label (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Label ID' })
  @ApiResponse({ status: 200, description: 'Label deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.labelService.getBoardId(id);
    if (!boardId) throw new ForbiddenException('Label not found');
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    await this.labelService.delete(id);
    return { message: 'Label deleted successfully' };
  }

  @Post('cards/:cardId/labels/:labelId')
  @ApiOperation({ summary: 'Add label to card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiParam({ name: 'labelId', description: 'Label ID' })
  @ApiResponse({ status: 201, description: 'Label assigned to card' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Label already assigned' })
  async addToCard(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.labelService.addToCard(labelId, cardId);
  }

  @Delete('cards/:cardId/labels/:labelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove label from card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiParam({ name: 'labelId', description: 'Label ID' })
  @ApiResponse({ status: 200, description: 'Label removed from card' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Label not assigned' })
  async removeFromCard(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.labelService.removeFromCard(labelId, cardId);
    return { message: 'Label removed from card' };
  }

  private async requireBoardMembership(boardId: string, userId: string) {
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) throw new ForbiddenException('You are not a member of this board');
    return role;
  }

  private async requireBoardRole(boardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireBoardMembership(boardId, userId);
    if (!allowed.includes(role)) throw new ForbiddenException('Insufficient permissions');
    return role;
  }

  private async requireCardBoardRole(cardId: string, userId: string, allowed: Role[]) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    return this.requireBoardRole(boardId, userId, allowed);
  }
}
