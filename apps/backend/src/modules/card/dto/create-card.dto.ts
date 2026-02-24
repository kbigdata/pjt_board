import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateCardDto {
  @ApiProperty({ example: 'Implement login page' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ example: 'Implement the login page with email/password form' })
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ example: 'uuid-of-column' })
  @IsString()
  @IsUUID()
  columnId!: string;

  @ApiPropertyOptional({ example: 'uuid-of-swimlane' })
  @IsString()
  @IsUUID()
  @IsOptional()
  swimlaneId?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-15T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  estimatedHours?: number;
}
