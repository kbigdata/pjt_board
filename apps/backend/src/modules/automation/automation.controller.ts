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
import { AutomationService } from './automation.service';
import { BoardService } from '../board/board.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly boardService: BoardService,
  ) {}

  @Post('boards/:boardId/automations')
  @ApiOperation({ summary: 'Create automation rule (OWNER/ADMIN only)' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Automation rule created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateAutomationDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.automationService.create(boardId, user.id, dto);
  }

  @Get('boards/:boardId/automations')
  @ApiOperation({ summary: 'List automation rules for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of automation rules' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findByBoard(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardMembership(boardId, user.id);
    return this.automationService.findByBoardId(boardId);
  }

  @Get('automations/:id')
  @ApiOperation({ summary: 'Get automation rule by ID' })
  @ApiParam({ name: 'id', description: 'Automation rule ID' })
  @ApiResponse({ status: 200, description: 'Automation rule details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async findOne(@Param('id') id: string) {
    return this.automationService.findById(id);
  }

  @Patch('automations/:id')
  @ApiOperation({ summary: 'Update automation rule' })
  @ApiParam({ name: 'id', description: 'Automation rule ID' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    const rule = await this.automationService.findById(id);
    await this.requireBoardRole(rule.boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.automationService.update(id, dto);
  }

  @Delete('automations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete automation rule' })
  @ApiParam({ name: 'id', description: 'Automation rule ID' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const rule = await this.automationService.findById(id);
    await this.requireBoardRole(rule.boardId, user.id, [Role.OWNER, Role.ADMIN]);
    await this.automationService.delete(id);
    return { message: 'Automation rule deleted successfully' };
  }

  @Post('automations/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle automation rule enabled/disabled' })
  @ApiParam({ name: 'id', description: 'Automation rule ID' })
  @ApiResponse({ status: 200, description: 'Rule toggled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async toggle(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const rule = await this.automationService.findById(id);
    await this.requireBoardRole(rule.boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.automationService.toggle(id);
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
}
