import { Module } from '@nestjs/common';
import { CardTagService } from './card-tag.service';
import { CardTagController } from './card-tag.controller';
import { CardModule } from '../card/card.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [CardModule, BoardModule],
  controllers: [CardTagController],
  providers: [CardTagService],
  exports: [CardTagService],
})
export class CardTagModule {}
