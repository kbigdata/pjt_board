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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SavedFilterService } from './saved-filter.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Saved Filters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SavedFilterController {
  constructor(private readonly savedFilterService: SavedFilterService) {}

  @Post('boards/:boardId/saved-filters')
  @ApiOperation({ summary: 'Create a saved filter for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Saved filter created' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
    @Body() dto: CreateSavedFilterDto,
  ) {
    return this.savedFilterService.create(boardId, user.id, dto);
  }

  @Get('boards/:boardId/saved-filters')
  @ApiOperation({ summary: 'List saved filters for a board (current user only)' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of saved filters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('boardId') boardId: string,
  ) {
    return this.savedFilterService.findByBoardAndUser(boardId, user.id);
  }

  @Patch('saved-filters/:id')
  @ApiOperation({ summary: 'Update a saved filter' })
  @ApiParam({ name: 'id', description: 'Saved filter ID' })
  @ApiResponse({ status: 200, description: 'Saved filter updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner of the filter' })
  @ApiResponse({ status: 404, description: 'Saved filter not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    return this.savedFilterService.update(id, user.id, dto);
  }

  @Delete('saved-filters/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved filter' })
  @ApiParam({ name: 'id', description: 'Saved filter ID' })
  @ApiResponse({ status: 200, description: 'Saved filter deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner of the filter' })
  @ApiResponse({ status: 404, description: 'Saved filter not found' })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.savedFilterService.delete(id, user.id);
    return { message: 'Saved filter deleted successfully' };
  }
}
