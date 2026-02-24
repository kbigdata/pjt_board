import { Module } from '@nestjs/common';
import { SwimlaneService } from './swimlane.service';
import { SwimlaneController } from './swimlane.controller';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [BoardModule],
  controllers: [SwimlaneController],
  providers: [SwimlaneService],
  exports: [SwimlaneService],
})
export class SwimlaneModule {}
