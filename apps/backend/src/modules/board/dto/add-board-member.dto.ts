import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class AddBoardMemberDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.MEMBER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
