import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of notifications to return' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination (notification ID)' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Return only unread notifications' })
  @ApiResponse({ status: 200, description: 'Notification list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findByUserId(user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notificationService.countUnread(user.id);
    return { count };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings for the current user' })
  @ApiResponse({ status: 200, description: 'Notification settings returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSettings(@CurrentUser() user: { id: string }) {
    return this.notificationService.getSettings(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update a notification setting' })
  @ApiResponse({ status: 200, description: 'Notification setting updated' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateSetting(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    return this.notificationService.updateSetting(user.id, dto.type, dto.enabled);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
