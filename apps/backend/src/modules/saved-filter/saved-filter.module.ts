import { Module } from '@nestjs/common';
import { SavedFilterService } from './saved-filter.service';
import { SavedFilterController } from './saved-filter.controller';

@Module({
  controllers: [SavedFilterController],
  providers: [SavedFilterService],
  exports: [SavedFilterService],
})
export class SavedFilterModule {}
