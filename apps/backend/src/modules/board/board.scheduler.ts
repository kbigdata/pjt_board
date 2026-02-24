import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BoardService } from './board.service';

@Injectable()
export class BoardScheduler {
  private readonly logger = new Logger(BoardScheduler.name);

  constructor(private readonly boardService: BoardService) {}

  @Cron('0 3 * * *')
  async handleExpiredArchives() {
    this.logger.log('Running expired board archive cleanup...');
    const count = await this.boardService.cleanupExpiredArchives();
    this.logger.log(`Cleaned up ${count} expired archived boards`);
  }
}
