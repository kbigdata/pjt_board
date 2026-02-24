import { PartialType } from '@nestjs/swagger';
import { CreateRecurringConfigDto } from './create-recurring-config.dto';

export class UpdateRecurringConfigDto extends PartialType(CreateRecurringConfigDto) {}
