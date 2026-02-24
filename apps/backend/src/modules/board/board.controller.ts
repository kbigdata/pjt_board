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
import { BoardService } from './board.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { UpdateBoardMemberRoleDto } from './dto/update-board-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Boards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  // ── Workspace-scoped endpoints ──

  @Post('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'Create a new board in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a workspace member' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateBoardDto,
  ) {
    await this.requireWorkspaceMembership(workspaceId, user.id);
    return this.boardService.create(workspaceId, user.id, dto);
  }

  @Get('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'List boards in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of boards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a workspace member' })
  async findAllInWorkspace(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
  ) {
    await this.requireWorkspaceMembership(workspaceId, user.id);
    return this.boardService.findAllByWorkspaceId(workspaceId);
  }

  @Get('workspaces/:workspaceId/boards/archived')
  @ApiOperation({ summary: 'List archived boards in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of archived boards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a workspace member' })
  async findArchivedInWorkspace(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
  ) {
    await this.requireWorkspaceMembership(workspaceId, user.id);
    return this.boardService.findArchivedByWorkspaceId(workspaceId);
  }

  // ── Board-scoped endpoints ──

  @Get('boards/:id')
  @ApiOperation({ summary: 'Get board details with members and columns' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireBoardMembership(id, user.id);
    return this.boardService.findById(id);
  }

  @Patch('boards/:id')
  @ApiOperation({ summary: 'Update board (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.boardService.update(id, dto);
  }

  @Post('boards/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive board (soft delete, OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @ApiResponse({ status: 409, description: 'Board already archived' })
  async archive(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.boardService.archive(id);
  }

  @Post('boards/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived board (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board restored' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @ApiResponse({ status: 409, description: 'Board is not archived' })
  async restore(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.boardService.restore(id);
  }

  @Delete('boards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete board (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can delete' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER]);
    await this.boardService.delete(id);
    return { message: 'Board deleted successfully' };
  }

  @Delete('boards/:id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete board from trash (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board permanently deleted from trash' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can permanently delete' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async permanentDelete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER]);
    await this.boardService.permanentDelete(id);
    return { message: 'Board permanently deleted' };
  }

  // ── Member management endpoints ──

  @Post('boards/:id/members')
  @ApiOperation({ summary: 'Add member to board (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board or user not found' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  async addMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: AddBoardMemberDto,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.boardService.addMember(id, dto.userId, dto.role);
  }

  @Patch('boards/:id/members/:userId')
  @ApiOperation({ summary: 'Update board member role (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can change roles' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateBoardMemberRoleDto,
  ) {
    await this.requireBoardRole(id, user.id, [Role.OWNER]);
    return this.boardService.updateMemberRole(id, userId, dto.role);
  }

  @Delete('boards/:id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member or leave board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or cannot remove OWNER' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const isSelfLeave = user.id === userId;
    if (!isSelfLeave) {
      await this.requireBoardRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    }
    await this.boardService.removeMember(id, userId);
    return { message: 'Member removed successfully' };
  }

  // ── Helpers ──

  private async requireWorkspaceMembership(workspaceId: string, userId: string) {
    const role = await this.workspaceService.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return role;
  }

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
}
