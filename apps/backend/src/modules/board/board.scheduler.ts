import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BoardService } from './board.service';
import { NotificationService } from '../notification/notification.service';
import { RecurringService } from '../recurring/recurring.service';
import { ReportService } from '../report/report.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoardScheduler {
  private readonly logger = new Logger(BoardScheduler.name);

  constructor(
    private readonly boardService: BoardService,
    private readonly notificationService: NotificationService,
    private readonly recurringService: RecurringService,
    private readonly reportService: ReportService,
    private readonly prisma: PrismaService,
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

  @Cron('*/30 * * * *')
  async handleRecurringCards() {
    this.logger.log('Processing recurring cards...');
    const count = await this.recurringService.processRecurringCards();
    this.logger.log(`Created ${count} recurring card(s)`);
  }

  @Cron('0 0 * * *')
  async handleDailySnapshot() {
    this.logger.log('Taking daily column snapshots...');
    const boards = await this.prisma.board.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    for (const board of boards) {
      await this.reportService.takeSnapshot(board.id);
    }
    this.logger.log(`Took snapshots for ${boards.length} boards`);
  }
}
