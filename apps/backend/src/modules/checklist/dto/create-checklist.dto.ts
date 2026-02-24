import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateChecklistDto {
  @ApiProperty({ example: 'QA Checklist' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
