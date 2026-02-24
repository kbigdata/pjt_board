import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('boards/:boardId/activities')
  @ApiOperation({ summary: 'Get board activity log' })
  @ApiResponse({ status: 200, description: 'Activity list returned' })
  findByBoardId(
    @Param('boardId') boardId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.activityService.findByBoardId(boardId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    });
  }
}
