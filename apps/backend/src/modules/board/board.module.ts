import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { BoardGateway } from './board.gateway';
import { BoardScheduler } from './board.scheduler';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationModule } from '../notification/notification.module';
import { AutomationModule } from '../automation/automation.module';
import { RecurringModule } from '../recurring/recurring.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [
    WorkspaceModule,
    ActivityModule,
    NotificationModule,
    forwardRef(() => AutomationModule),
    RecurringModule,
    ReportModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'super-secret-key-change-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardGateway, BoardScheduler],
  exports: [BoardService, BoardGateway],
})
export class BoardModule {}
