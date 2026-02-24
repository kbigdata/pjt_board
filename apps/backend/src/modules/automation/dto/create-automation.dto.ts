import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AutomationTriggerDto {
  @ApiProperty({ description: 'Trigger type (e.g. cardMoved, cardCreated, labelAdded)' })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

export class CreateAutomationDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Trigger definition', type: () => Object })
  @IsObject()
  trigger!: AutomationTriggerDto;

  @ApiPropertyOptional({ description: 'Condition list', type: () => [Object] })
  @IsArray()
  @IsOptional()
  conditions?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Action list', type: () => [Object] })
  @IsArray()
  @IsOptional()
  actions?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Whether the rule is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
