import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDto {
  @ApiProperty({ description: 'Name of the custom field' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: CustomFieldType, description: 'Type of the custom field' })
  @IsEnum(CustomFieldType)
  fieldType!: CustomFieldType;

  @ApiPropertyOptional({
    type: [String],
    description: 'Options for DROPDOWN type fields',
  })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ description: 'Whether the field is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
