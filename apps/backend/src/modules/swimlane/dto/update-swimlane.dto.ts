import { PartialType } from '@nestjs/swagger';
import { CreateSwimlaneDto } from './create-swimlane.dto';

export class UpdateSwimlaneDto extends PartialType(CreateSwimlaneDto) {}
