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
import { TemplateService } from './template.service';
import { BoardService } from '../board/board.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly boardService: BoardService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Post('boards/:boardId/templates')
  @ApiOperation({ summary: 'Create a template from an existing board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Template created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async createFromBoard(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.templateService.createFromBoard(boardId, user.id, dto.name, dto.description);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List all templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.templateService.findAll();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Post('workspaces/:workspaceId/boards/from-template/:templateId')
  @ApiOperation({ summary: 'Apply template to create a new board in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Board created from template' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a workspace member' })
  @ApiResponse({ status: 404, description: 'Template or workspace not found' })
  async applyTemplate(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    await this.requireWorkspaceMembership(workspaceId, user.id);
    return this.templateService.applyTemplate(templateId, workspaceId, user.id, dto.title);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(@Param('id') id: string) {
    await this.templateService.delete(id);
    return { message: 'Template deleted successfully' };
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
