import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CardModule } from '../card/card.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [CardModule, BoardModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
