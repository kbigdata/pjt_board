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
  ApiProperty,
} from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { SprintService } from './sprint.service';
import { BoardService } from '../board/board.service';
import { BoardGateway } from '../board/board.gateway';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CardIdsDto {
  @ApiProperty({ type: [String], example: ['card-uuid-1', 'card-uuid-2'] })
  @IsArray()
  @IsString({ each: true })
  cardIds!: string[];
}

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SprintController {
  constructor(
    private readonly sprintService: SprintService,
    private readonly boardService: BoardService,
    private readonly boardGateway: BoardGateway,
  ) {}

  @Post('boards/:boardId/sprints')
  @ApiOperation({ summary: 'Create a new sprint in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Sprint created' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateSprintDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const sprint = await this.sprintService.create(boardId, dto);
    this.boardGateway.emitSprintCreated(boardId, sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  @Get('boards/:boardId/sprints')
  @ApiOperation({ summary: 'List all sprints in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of sprints' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.sprintService.findAllByBoardId(boardId);
  }

  @Get('boards/:boardId/sprints/active')
  @ApiOperation({ summary: 'Get the active sprint for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Active sprint or null' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findActive(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.sprintService.findActiveByBoardId(boardId);
  }

  @Get('sprints/:id')
  @ApiOperation({ summary: 'Get sprint by ID' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.requireSprintBoardMembership(id, user.id);
    void boardId;
    return this.sprintService.findById(id);
  }

  @Patch('sprints/:id')
  @ApiOperation({ summary: 'Update sprint (PLANNING status only)' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint updated' })
  @ApiResponse({ status: 400, description: 'Sprint is not in PLANNING status or invalid dates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const sprint = await this.sprintService.update(id, dto);
    this.boardGateway.emitSprintUpdated(boardId, sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  @Post('sprints/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a sprint (PLANNING → ACTIVE)' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint started' })
  @ApiResponse({ status: 400, description: 'Sprint not in PLANNING status or board already has an active sprint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async start(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const sprint = await this.sprintService.start(id);
    this.boardGateway.emitSprintStarted(boardId, sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  @Post('sprints/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a sprint (ACTIVE → COMPLETED)' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint completed, incomplete cards unassigned' })
  @ApiResponse({ status: 400, description: 'Sprint is not ACTIVE' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async complete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const sprint = await this.sprintService.complete(id);
    this.boardGateway.emitSprintCompleted(boardId, sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  @Post('sprints/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a sprint (ACTIVE or PLANNING → CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint cancelled, all cards unassigned' })
  @ApiResponse({ status: 400, description: 'Sprint cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const sprint = await this.sprintService.cancel(id);
    this.boardGateway.emitSprintUpdated(boardId, sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  @Post('sprints/:id/cards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add cards to a sprint' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Cards added to sprint' })
  @ApiResponse({ status: 400, description: 'Sprint is COMPLETED or CANCELLED' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async addCards(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CardIdsDto,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const result = await this.sprintService.addCards(id, dto.cardIds);
    this.boardGateway.emitSprintCardsChanged(boardId, result as unknown as Record<string, unknown>);
    return result;
  }

  @Delete('sprints/:id/cards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove cards from a sprint' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Cards removed from sprint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async removeCards(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CardIdsDto,
  ) {
    const boardId = await this.requireSprintBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const result = await this.sprintService.removeCards(id, dto.cardIds);
    this.boardGateway.emitSprintCardsChanged(boardId, result as unknown as Record<string, unknown>);
    return result;
  }

  @Get('sprints/:id/progress')
  @ApiOperation({ summary: 'Get sprint progress statistics' })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint progress: total, done, inProgress, todo, percentComplete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async getProgress(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireSprintBoardMembership(id, user.id);
    return this.sprintService.getProgress(id);
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

  private async requireSprintBoardMembership(
    sprintId: string,
    userId: string,
  ): Promise<string> {
    const boardId = await this.sprintService.getBoardId(sprintId);
    if (!boardId) throw new ForbiddenException('Sprint not found');
    await this.requireBoardMembership(boardId, userId);
    return boardId;
  }

  private async requireSprintBoardRole(
    sprintId: string,
    userId: string,
    allowed: Role[],
  ): Promise<string> {
    const boardId = await this.sprintService.getBoardId(sprintId);
    if (!boardId) throw new ForbiddenException('Sprint not found');
    await this.requireBoardRole(boardId, userId, allowed);
    return boardId;
  }
}
