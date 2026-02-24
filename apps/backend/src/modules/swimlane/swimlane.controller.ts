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
import { SwimlaneService } from './swimlane.service';
import { BoardService } from '../board/board.service';
import { CreateSwimlaneDto } from './dto/create-swimlane.dto';
import { UpdateSwimlaneDto } from './dto/update-swimlane.dto';
import { MoveSwimlaneDto } from './dto/move-swimlane.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BoardGateway } from '../board/board.gateway';

@ApiTags('Swimlanes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SwimlaneController {
  constructor(
    private readonly swimlaneService: SwimlaneService,
    private readonly boardService: BoardService,
    private readonly boardGateway: BoardGateway,
  ) {}

  @Post('boards/:boardId/swimlanes')
  @ApiOperation({ summary: 'Create a new swimlane in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Swimlane created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateSwimlaneDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const swimlane = await this.swimlaneService.create(boardId, dto);
    this.boardGateway.emitSwimlaneCreated(boardId, swimlane as unknown as Record<string, unknown>);
    return swimlane;
  }

  @Get('boards/:boardId/swimlanes')
  @ApiOperation({ summary: 'List swimlanes in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of swimlanes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.swimlaneService.findAllByBoardId(boardId);
  }

  @Patch('swimlanes/:id')
  @ApiOperation({ summary: 'Update swimlane (OWNER/ADMIN/MEMBER)' })
  @ApiParam({ name: 'id', description: 'Swimlane ID' })
  @ApiResponse({ status: 200, description: 'Swimlane updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Swimlane not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSwimlaneDto,
  ) {
    const boardId = await this.requireSwimlaneBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const swimlane = await this.swimlaneService.update(id, dto);
    this.boardGateway.emitSwimlaneUpdated(boardId, swimlane as unknown as Record<string, unknown>);
    return swimlane;
  }

  @Patch('swimlanes/:id/move')
  @ApiOperation({ summary: 'Move swimlane (update position)' })
  @ApiParam({ name: 'id', description: 'Swimlane ID' })
  @ApiResponse({ status: 200, description: 'Swimlane moved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Swimlane not found' })
  async move(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: MoveSwimlaneDto,
  ) {
    const boardId = await this.requireSwimlaneBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);
    const swimlane = await this.swimlaneService.move(id, dto.position);
    this.boardGateway.emitSwimlaneMoved(boardId, swimlane as unknown as Record<string, unknown>);
    return swimlane;
  }

  @Post('swimlanes/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive swimlane (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Swimlane ID' })
  @ApiResponse({ status: 200, description: 'Swimlane archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Swimlane not found' })
  async archive(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireSwimlaneBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.swimlaneService.archive(id);
  }

  @Post('swimlanes/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived swimlane (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Swimlane ID' })
  @ApiResponse({ status: 200, description: 'Swimlane restored' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Swimlane not found' })
  async restore(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireSwimlaneBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.swimlaneService.restore(id);
  }

  @Delete('swimlanes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete swimlane (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Swimlane ID' })
  @ApiResponse({ status: 200, description: 'Swimlane deleted' })
  @ApiResponse({ status: 400, description: 'Swimlane has cards — reassign or archive first' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Swimlane not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireSwimlaneBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    await this.swimlaneService.delete(id);
    return { message: 'Swimlane deleted successfully' };
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

  private async requireSwimlaneBoardRole(
    swimlaneId: string,
    userId: string,
    allowed: Role[],
  ): Promise<string> {
    const boardId = await this.swimlaneService.getBoardId(swimlaneId);
    if (!boardId) throw new ForbiddenException('Swimlane not found');
    await this.requireBoardRole(boardId, userId, allowed);
    return boardId;
  }
}
