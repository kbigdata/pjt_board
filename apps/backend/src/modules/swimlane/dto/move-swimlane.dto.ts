import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class MoveSwimlaneDto {
  @ApiProperty({ example: 2048, description: 'New position (fractional indexing)' })
  @IsNumber()
  @IsPositive()
  position!: number;
}
