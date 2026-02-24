import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationSettingDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type to configure' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: true, description: 'Whether this notification type is enabled' })
  @IsBoolean()
  enabled!: boolean;
}
