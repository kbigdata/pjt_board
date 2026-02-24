import { Module, forwardRef } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [forwardRef(() => BoardModule)],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
