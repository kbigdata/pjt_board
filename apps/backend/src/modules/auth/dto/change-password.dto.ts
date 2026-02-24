import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldP@ssword1' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  currentPassword!: string;

  @ApiProperty({ example: 'newP@ssword2' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
