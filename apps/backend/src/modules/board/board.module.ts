import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { BoardGateway } from './board.gateway';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    WorkspaceModule,
    ActivityModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'super-secret-key-change-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardGateway],
  exports: [BoardService, BoardGateway],
})
export class BoardModule {}
