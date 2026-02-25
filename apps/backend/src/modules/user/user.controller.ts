import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: { id: string }) {
    const found = await this.userService.findById(user.id);
    return this.userService.stripPassword(found);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users by email or name' })
  @ApiQuery({ name: 'q', description: 'Search keyword (min 2 chars)', required: true })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchUsers(@Query('q') q: string) {
    return this.userService.searchUsers(q ?? '');
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.userService.updateProfile(user.id, dto);
    return this.userService.stripPassword(updated);
  }
}
