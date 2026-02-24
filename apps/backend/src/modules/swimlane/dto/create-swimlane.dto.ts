import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateSwimlaneDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @MaxLength(7)
  @IsOptional()
  color?: string;
}
