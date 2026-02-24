import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '#EF4444' })
  @IsString()
  @MaxLength(7)
  color!: string;
}
