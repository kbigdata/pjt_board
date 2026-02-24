import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsInt, IsPositive } from 'class-validator';
import { ColumnType } from '@prisma/client';

export class CreateColumnDto {
  @ApiProperty({ example: 'To Do' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ example: 'Work items that need to be started' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ColumnType, default: ColumnType.CUSTOM })
  @IsEnum(ColumnType)
  @IsOptional()
  columnType?: ColumnType;

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  wipLimit?: number;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @MaxLength(7)
  @IsOptional()
  color?: string;
}
