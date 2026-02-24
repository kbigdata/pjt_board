import { ApiProperty } from '@nestjs/swagger';

export class SetCustomFieldValueDto {
  @ApiProperty({
    description: 'The value — type depends on the field type (string, number, boolean, or null)',
  })
  value!: string | number | boolean | null;
}
