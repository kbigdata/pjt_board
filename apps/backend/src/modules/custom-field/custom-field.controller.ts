import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { CustomFieldService } from './custom-field.service';
import { CardService } from '../card/card.service';
import { BoardService } from '../board/board.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { SetCustomFieldValueDto } from './dto/set-custom-field-value.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CustomFieldController {
  constructor(
    private readonly customFieldService: CustomFieldService,
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
  ) {}

  // ── Field Definition Endpoints ──

  @Post('boards/:boardId/custom-fields')
  @ApiOperation({ summary: 'Create a custom field definition for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Custom field definition created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async createDefinition(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.customFieldService.createDefinition(boardId, dto);
  }

  @Get('boards/:boardId/custom-fields')
  @ApiOperation({ summary: 'List all custom field definitions for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of custom field definitions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findDefinitionsByBoard(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    await this.requireBoardAccess(boardId, user.id);
    return this.customFieldService.findDefinitionsByBoardId(boardId);
  }

  @Patch('custom-fields/:id')
  @ApiOperation({ summary: 'Update a custom field definition' })
  @ApiParam({ name: 'id', description: 'Custom field definition ID' })
  @ApiResponse({ status: 200, description: 'Custom field definition updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Custom field definition not found' })
  async updateDefinition(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    const boardId = await this.customFieldService.getBoardIdByFieldId(id);
    if (!boardId) throw new ForbiddenException('Custom field definition not found');
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    return this.customFieldService.updateDefinition(id, dto);
  }

  @Delete('custom-fields/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom field definition' })
  @ApiParam({ name: 'id', description: 'Custom field definition ID' })
  @ApiResponse({ status: 200, description: 'Custom field definition deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Custom field definition not found' })
  async deleteDefinition(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.customFieldService.getBoardIdByFieldId(id);
    if (!boardId) throw new ForbiddenException('Custom field definition not found');
    await this.requireBoardRole(boardId, user.id, [Role.OWNER, Role.ADMIN]);
    await this.customFieldService.deleteDefinition(id);
    return { message: 'Custom field definition deleted successfully' };
  }

  // ── Field Value Endpoints ──

  @Put('cards/:cardId/custom-fields/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a custom field value on a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiParam({ name: 'fieldId', description: 'Custom field definition ID' })
  @ApiResponse({ status: 200, description: 'Custom field value set' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card or field not found' })
  async setValue(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: SetCustomFieldValueDto,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    return this.customFieldService.setValue(cardId, fieldId, dto.value);
  }

  @Get('cards/:cardId/custom-fields')
  @ApiOperation({ summary: 'Get all custom field values for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of custom field values with field definitions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async getValuesByCard(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.customFieldService.getValuesByCardId(cardId);
  }

  @Delete('cards/:cardId/custom-fields/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom field value from a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiParam({ name: 'fieldId', description: 'Custom field definition ID' })
  @ApiResponse({ status: 200, description: 'Custom field value deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Custom field value not found' })
  async deleteValue(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Param('fieldId') fieldId: string,
  ) {
    await this.requireCardBoardRole(cardId, user.id, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await this.customFieldService.deleteValue(cardId, fieldId);
    return { message: 'Custom field value deleted successfully' };
  }

  // ── Helpers ──

  private async requireBoardAccess(boardId: string, userId: string) {
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) throw new ForbiddenException('You are not a member of this board');
    return role;
  }

  private async requireBoardRole(boardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireBoardAccess(boardId, userId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
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
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
  }
}
