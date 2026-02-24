import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ColumnService } from './column.service';
import { BoardService } from '../board/board.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ColumnController {
  constructor(
    private readonly columnService: ColumnService,
    private readonly boardService: BoardService,
  ) {}

  @Post('boards/:boardId/columns')
  @ApiOperation({ summary: 'Create a new column in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Column created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.columnService.create(boardId, dto);
  }

  @Get('boards/:boardId/columns')
  @ApiOperation({ summary: 'List columns in board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of columns' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.columnService.findAllByBoardId(boardId);
  }

  @Get('columns/:id')
  @ApiOperation({ summary: 'Get column details with cards' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiResponse({ status: 200, description: 'Column details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.columnService.getBoardId(id);
    if (!boardId) throw new ForbiddenException('Column not found');
    await this.requireBoardMembership(boardId, user.id);
    return this.columnService.findById(id);
  }

  @Patch('columns/:id')
  @ApiOperation({ summary: 'Update column (OWNER/ADMIN/MEMBER)' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiResponse({ status: 200, description: 'Column updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
  ) {
    const boardId = await this.requireColumnBoardAccess(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.columnService.update(id, dto);
  }

  @Patch('columns/:id/move')
  @ApiOperation({ summary: 'Move column (update position)' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiResponse({ status: 200, description: 'Column moved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  async move(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: MoveColumnDto,
  ) {
    await this.requireColumnBoardAccess(id, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.columnService.move(id, dto.position);
  }

  @Post('columns/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive column (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiResponse({ status: 200, description: 'Column archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  async archive(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireColumnBoardAccess(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.columnService.archive(id);
  }

  @Post('columns/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived column (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiResponse({ status: 200, description: 'Column restored' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  async restore(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireColumnBoardAccess(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.columnService.restore(id);
  }

  @Delete('columns/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete column, optionally migrating cards to another column (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Column ID' })
  @ApiQuery({
    name: 'targetColumnId',
    required: false,
    description: 'Target column ID to migrate cards into before deleting',
  })
  @ApiResponse({ status: 200, description: 'Column deleted' })
  @ApiResponse({ status: 400, description: 'Column has cards and no target column provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Column or target column not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('targetColumnId') targetColumnId?: string,
  ) {
    await this.requireColumnBoardAccess(id, user.id, [Role.OWNER, Role.ADMIN]);
    await this.columnService.deleteWithMigration(id, targetColumnId);
    return { message: 'Column deleted successfully' };
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

  private async requireColumnBoardAccess(columnId: string, userId: string, allowed: Role[]) {
    const boardId = await this.columnService.getBoardId(columnId);
    if (!boardId) throw new ForbiddenException('Column not found');
    return this.requireBoardRole(boardId, userId, allowed);
  }
}
