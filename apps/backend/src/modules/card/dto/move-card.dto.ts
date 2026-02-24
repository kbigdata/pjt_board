import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class MoveCardDto {
  @ApiProperty({ example: 'uuid-of-column' })
  @IsString()
  @IsUUID()
  columnId!: string;

  @ApiPropertyOptional({ example: 'uuid-of-swimlane' })
  @IsString()
  @IsUUID()
  @IsOptional()
  swimlaneId?: string;

  @ApiProperty({ example: 2048, description: 'New position (fractional indexing)' })
  @IsNumber()
  @IsPositive()
  position!: number;
}
