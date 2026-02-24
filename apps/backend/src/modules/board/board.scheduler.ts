import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BoardService } from './board.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BoardScheduler {
  private readonly logger = new Logger(BoardScheduler.name);

  constructor(
    private readonly boardService: BoardService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 3 * * *')
  async handleExpiredArchives() {
    this.logger.log('Running expired board archive cleanup...');
    const count = await this.boardService.cleanupExpiredArchives();
    this.logger.log(`Cleaned up ${count} expired archived boards`);
  }

  @Cron('0 8 * * *')
  async handleDueDateReminders() {
    this.logger.log('Running due date reminder notifications...');
    const count = await this.notificationService.createDueDateReminders();
    this.logger.log(`Sent ${count} due date reminder notification(s)`);
  }
}
