import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { BoardModule } from '../board/board.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [BoardModule, WorkspaceModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
