import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({ example: 'Verify login flow' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;
}
