import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum } from 'class-validator';
import { LinkType } from '@prisma/client';

export class CreateCardLinkDto {
  @ApiProperty({ example: 'uuid-of-target-card' })
  @IsString()
  @IsUUID()
  targetCardId!: string;

  @ApiProperty({ enum: LinkType, example: LinkType.BLOCKS })
  @IsEnum(LinkType)
  linkType!: LinkType;
}
