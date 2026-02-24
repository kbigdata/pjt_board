import { PartialType } from '@nestjs/swagger';
import { CreateSavedFilterDto } from './create-saved-filter.dto';

export class UpdateSavedFilterDto extends PartialType(CreateSavedFilterDto) {}
