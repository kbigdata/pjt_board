import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecurringConfigDto {
  @ApiProperty({ example: '0 9 * * 1', description: 'Cron expression' })
  @IsString()
  cronExpression!: string;

  @ApiPropertyOptional({ description: 'Next run date/time (ISO 8601). Computed from cron if omitted.' })
  @IsOptional()
  @IsDateString()
  nextRunAt?: string;

  @ApiPropertyOptional({ description: 'Whether the recurring config is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
