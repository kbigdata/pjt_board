import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'This looks good, ready for review.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Parent comment ID for thread replies' })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
