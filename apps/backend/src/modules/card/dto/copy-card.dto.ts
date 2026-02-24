import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CopyCardDto {
  @ApiPropertyOptional({ example: 'uuid-of-target-column' })
  @IsString()
  @IsUUID()
  @IsOptional()
  targetColumnId?: string;
}
