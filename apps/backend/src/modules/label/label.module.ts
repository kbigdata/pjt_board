import { Module } from '@nestjs/common';
import { LabelService } from './label.service';
import { LabelController } from './label.controller';
import { BoardModule } from '../board/board.module';
import { CardModule } from '../card/card.module';

@Module({
  imports: [BoardModule, CardModule],
  controllers: [LabelController],
  providers: [LabelService],
  exports: [LabelService],
})
export class LabelModule {}
