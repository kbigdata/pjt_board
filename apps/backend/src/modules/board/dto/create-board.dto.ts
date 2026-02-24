import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { Visibility } from '@prisma/client';

export class CreateBoardDto {
  @ApiProperty({ example: 'Sprint Board' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Board for tracking sprint tasks' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;
}
