import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
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
  ],
})
export class AppModule {}
