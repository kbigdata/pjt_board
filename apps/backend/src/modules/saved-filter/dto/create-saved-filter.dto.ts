import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateSavedFilterDto {
  @ApiProperty({
    example: 'High Priority + My Cards',
    description: 'Human-readable name for the saved filter',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: {
      priority: ['HIGH', 'CRITICAL'],
      assigneeIds: ['user-uuid'],
      labelIds: [],
      keyword: '',
      dueDateRange: { from: '2026-01-01', to: '2026-12-31' },
    },
    description:
      'Filter criteria object (priority, assigneeIds, labelIds, keyword, dueDateRange)',
  })
  @IsObject()
  @IsNotEmpty()
  filters!: Record<string, unknown>;
}
