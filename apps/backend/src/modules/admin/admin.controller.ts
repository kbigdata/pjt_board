import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiResponse({ status: 200, description: 'User list with pagination' })
  findAllUsers(@Query() query: AdminQueryDto) {
    return this.adminService.findAllUsers(query.page, query.limit, query.search);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail (admin)' })
  @ApiResponse({ status: 200, description: 'User detail with workspace memberships' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user admin status or deactivate (admin)' })
  @ApiResponse({ status: 200, description: 'Updated user' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUserAdmin(id, dto);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset user password (admin)' })
  @ApiResponse({ status: 200, description: 'Temporary password returned' })
  resetPassword(@Param('id') id: string) {
    return this.adminService.resetUserPassword(id);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List all workspaces (admin)' })
  @ApiResponse({ status: 200, description: 'Workspace list with pagination' })
  findAllWorkspaces(@Query() query: AdminQueryDto) {
    return this.adminService.findAllWorkspaces(query.page, query.limit, query.search);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace detail (admin)' })
  @ApiResponse({ status: 200, description: 'Workspace detail with members and boards' })
  getWorkspaceDetail(@Param('id') id: string) {
    return this.adminService.getWorkspaceDetail(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics (admin)' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings (admin)' })
  @ApiResponse({ status: 200, description: 'System settings list' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update system settings (admin)' })
  @ApiResponse({ status: 200, description: 'Updated settings' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto.settings);
  }
}
