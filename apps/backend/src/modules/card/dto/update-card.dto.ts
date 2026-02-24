import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { CreateCardDto } from './create-card.dto';

export class UpdateCardDto extends PartialType(CreateCardDto) {
  @ApiPropertyOptional({ example: 6.5 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  actualHours?: number;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  coverColor?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  coverImageUrl?: string;
}
