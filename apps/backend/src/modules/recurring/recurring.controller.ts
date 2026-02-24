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
import { RecurringService } from './recurring.service';
import { CreateRecurringConfigDto } from './dto/create-recurring-config.dto';
import { UpdateRecurringConfigDto } from './dto/update-recurring-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Recurring Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards/:cardId/recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring config for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Recurring config created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  create(@Param('cardId') cardId: string, @Body() dto: CreateRecurringConfigDto) {
    return this.recurringService.create(cardId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get recurring config for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Recurring config or null' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCardId(@Param('cardId') cardId: string) {
    return this.recurringService.findByCardId(cardId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update recurring config for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Recurring config updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recurring config not found' })
  update(@Param('cardId') cardId: string, @Body() dto: UpdateRecurringConfigDto) {
    return this.recurringService.update(cardId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete recurring config for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Recurring config deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recurring config not found' })
  async remove(@Param('cardId') cardId: string) {
    await this.recurringService.delete(cardId);
    return { message: 'Recurring config deleted successfully' };
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle recurring config enabled/disabled' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Recurring config toggled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recurring config not found' })
  toggle(@Param('cardId') cardId: string) {
    return this.recurringService.toggle(cardId);
  }
}
