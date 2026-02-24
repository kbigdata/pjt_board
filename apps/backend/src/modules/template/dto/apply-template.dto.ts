import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyTemplateDto {
  @ApiProperty({ description: 'Title for the new board' })
  @IsString()
  @IsNotEmpty()
  title!: string;
}
