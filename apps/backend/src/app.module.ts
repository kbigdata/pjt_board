import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { BoardModule } from './modules/board/board.module';
import { ColumnModule } from './modules/column/column.module';
import { CardModule } from './modules/card/card.module';
import { CommentModule } from './modules/comment/comment.module';
import { LabelModule } from './modules/label/label.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MinioModule } from './common/minio/minio.module';
import { AttachmentModule } from './modules/attachment/attachment.module';
import { SwimlaneModule } from './modules/swimlane/swimlane.module';
import { CardLinkModule } from './modules/card-link/card-link.module';
import { CardTagModule } from './modules/card-tag/card-tag.module';
import { AutomationModule } from './modules/automation/automation.module';
import { TemplateModule } from './modules/template/template.module';
import { CustomFieldModule } from './modules/custom-field/custom-field.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MinioModule,
    AuthModule,
    UserModule,
    WorkspaceModule,
    BoardModule,
    ColumnModule,
    CardModule,
    CommentModule,
    LabelModule,
    ChecklistModule,
    ActivityModule,
    NotificationModule,
    AttachmentModule,
    SwimlaneModule,
    CardLinkModule,
    CardTagModule,
    AutomationModule,
    TemplateModule,
    CustomFieldModule,
    RecurringModule,
    ReportModule,
  ],
})
export class AppModule {}
