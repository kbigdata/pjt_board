import { Module } from '@nestjs/common';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldController } from './custom-field.controller';
import { CardModule } from '../card/card.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [CardModule, BoardModule],
  controllers: [CustomFieldController],
  providers: [CustomFieldService],
  exports: [CustomFieldService],
})
export class CustomFieldModule {}
