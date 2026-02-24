import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddReactionDto {
  @ApiProperty({
    example: 'thumbsup',
    description: 'Emoji identifier (e.g., thumbsup, heart, laugh)',
  })
  @IsString()
  @IsNotEmpty()
  emoji!: string;
}
