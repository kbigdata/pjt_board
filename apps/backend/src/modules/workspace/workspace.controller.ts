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
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my workspaces' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.workspaceService.findAllByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details with members' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireMembership(id, user.id);
    return this.workspaceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    await this.requireRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.workspaceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete workspace (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can delete' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireRole(id, user.id, [Role.OWNER]);
    await this.workspaceService.delete(id);
    return { message: 'Workspace deleted successfully' };
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to workspace (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Workspace or user not found' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  async addMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    await this.requireRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    return this.workspaceService.addMember(id, dto.userId, dto.role);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can change roles' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    await this.requireRole(id, user.id, [Role.OWNER]);
    return this.workspaceService.updateMemberRole(id, userId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member or leave workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
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
      await this.requireRole(id, user.id, [Role.OWNER, Role.ADMIN]);
    }
    await this.workspaceService.removeMember(id, userId);
    return { message: 'Member removed successfully' };
  }

  private async requireMembership(workspaceId: string, userId: string) {
    const role = await this.workspaceService.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return role;
  }

  private async requireRole(workspaceId: string, userId: string, allowed: Role[]) {
    const role = await this.requireMembership(workspaceId, userId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
  }
}
