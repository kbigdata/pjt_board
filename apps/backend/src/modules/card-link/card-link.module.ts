import { Module } from '@nestjs/common';
import { CardLinkService } from './card-link.service';
import { CardLinkController } from './card-link.controller';
import { CardModule } from '../card/card.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [CardModule, BoardModule],
  controllers: [CardLinkController],
  providers: [CardLinkService],
  exports: [CardLinkService],
})
export class CardLinkModule {}
