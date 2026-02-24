import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { CardModule } from '../card/card.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [CardModule, BoardModule],
  controllers: [ChecklistController],
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
