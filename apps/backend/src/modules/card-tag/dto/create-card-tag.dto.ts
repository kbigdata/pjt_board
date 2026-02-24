import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCardTagDto {
  @ApiProperty({ example: 'urgent' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  tag!: string;
}
