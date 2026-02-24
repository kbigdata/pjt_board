import { Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { BoardModule } from '../board/board.module';
import { CardModule } from '../card/card.module';

@Module({
  imports: [BoardModule, CardModule],
  controllers: [AttachmentController],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentModule {}
