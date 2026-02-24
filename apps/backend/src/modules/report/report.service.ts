import { Injectable, Logger } from '@nestjs/common';
import { ColumnType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CFDDataPoint {
  date: string;
  columns: Array<{ columnId: string; columnTitle: string; count: number }>;
}

export interface LeadTimeDataPoint {
  cardId: string;
  cardTitle: string;
  leadTimeHours: number;
  startedAt: Date;
  completedAt: Date;
}

export interface ThroughputDataPoint {
  date: string;
  count: number;
}

export interface CycleTimeDataPoint {
  columnId: string;
  columnTitle: string;
  durationHours: number;
  enteredAt: Date;
  exitedAt: Date | null;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Take a snapshot of card counts per column for the given board, for today's date.
   * Uses upsert to avoid duplicates.
   */
  async takeSnapshot(boardId: string): Promise<void> {
    const columns = await this.prisma.column.findMany({
      where: { boardId, archivedAt: null },
      select: { id: true },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const column of columns) {
      const count = await this.prisma.card.count({
        where: { columnId: column.id, archivedAt: null },
      });

      await this.prisma.columnSnapshot.upsert({
        where: { columnId_date: { columnId: column.id, date: today } },
        create: {
          boardId,
          columnId: column.id,
          cardCount: count,
          date: today,
        },
        update: { cardCount: count },
      });
    }

    this.logger.debug(`Took snapshot for board ${boardId} on ${today.toISOString()}`);
  }

  /**
   * Get Cumulative Flow Diagram data: card counts per column per day.
   */
  async getCFDData(boardId: string, fromDate: Date, toDate: Date): Promise<CFDDataPoint[]> {
    const snapshots = await this.prisma.columnSnapshot.findMany({
      where: {
        boardId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch column titles
    const columnIds = [...new Set(snapshots.map((s) => s.columnId))];
    const columns = await this.prisma.column.findMany({
      where: { id: { in: columnIds } },
      select: { id: true, title: true },
    });
    const columnTitleMap = new Map(columns.map((c) => [c.id, c.title]));

    // Group by date
    const dateMap = new Map<string, CFDDataPoint>();

    for (const snapshot of snapshots) {
      const dateKey = snapshot.date.toISOString().slice(0, 10);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, columns: [] });
      }
      dateMap.get(dateKey)!.columns.push({
        columnId: snapshot.columnId,
        columnTitle: columnTitleMap.get(snapshot.columnId) ?? 'Unknown',
        count: snapshot.cardCount,
      });
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Log a card status transition.
   */
  async logCardMove(
    cardId: string,
    boardId: string,
    fromColumnId: string | undefined,
    toColumnId: string,
  ): Promise<void> {
    await this.prisma.cardStatusLog.create({
      data: {
        cardId,
        boardId,
        fromColumnId: fromColumnId ?? null,
        toColumnId,
      },
    });
  }

  /**
   * Calculate lead time (first TODO entry → first DONE entry) for cards in date range.
   */
  async getLeadTimeData(
    boardId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<LeadTimeDataPoint[]> {
    // Find TODO and DONE columns on this board
    const columns = await this.prisma.column.findMany({
      where: { boardId },
      select: { id: true, columnType: true, title: true },
    });

    const todoColumnIds = columns
      .filter((c) => c.columnType === ColumnType.TODO)
      .map((c) => c.id);
    const doneColumnIds = columns
      .filter((c) => c.columnType === ColumnType.DONE)
      .map((c) => c.id);

    // Get all status logs within date range for this board
    const logs = await this.prisma.cardStatusLog.findMany({
      where: {
        boardId,
        movedAt: { gte: fromDate, lte: toDate },
      },
      include: { card: { select: { id: true, title: true } } },
      orderBy: { movedAt: 'asc' },
    });

    // Group by cardId
    const cardLogsMap = new Map<string, typeof logs>();
    for (const log of logs) {
      if (!cardLogsMap.has(log.cardId)) {
        cardLogsMap.set(log.cardId, []);
      }
      cardLogsMap.get(log.cardId)!.push(log);
    }

    const results: LeadTimeDataPoint[] = [];

    for (const [, cardLogs] of cardLogsMap) {
      // First entry into a TODO column
      const todoEntry = cardLogs.find((l) => todoColumnIds.includes(l.toColumnId));
      // First entry into a DONE column
      const doneEntry = cardLogs.find((l) => doneColumnIds.includes(l.toColumnId));

      if (todoEntry && doneEntry && doneEntry.movedAt > todoEntry.movedAt) {
        const leadTimeHours =
          (doneEntry.movedAt.getTime() - todoEntry.movedAt.getTime()) / (1000 * 60 * 60);
        results.push({
          cardId: todoEntry.cardId,
          cardTitle: todoEntry.card.title,
          leadTimeHours: Math.round(leadTimeHours * 100) / 100,
          startedAt: todoEntry.movedAt,
          completedAt: doneEntry.movedAt,
        });
      }
    }

    return results;
  }

  /**
   * Count cards that entered a DONE column per day in the date range.
   */
  async getThroughputData(
    boardId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ThroughputDataPoint[]> {
    const columns = await this.prisma.column.findMany({
      where: { boardId, columnType: ColumnType.DONE },
      select: { id: true },
    });
    const doneColumnIds = columns.map((c) => c.id);

    if (doneColumnIds.length === 0) {
      return [];
    }

    const logs = await this.prisma.cardStatusLog.findMany({
      where: {
        boardId,
        toColumnId: { in: doneColumnIds },
        movedAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { movedAt: 'asc' },
    });

    // Group by date
    const dateCountMap = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.movedAt.toISOString().slice(0, 10);
      dateCountMap.set(dateKey, (dateCountMap.get(dateKey) ?? 0) + 1);
    }

    return Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Compute how long a card spent in each column based on its status logs.
   */
  async getCardCycleTime(cardId: string): Promise<CycleTimeDataPoint[]> {
    const logs = await this.prisma.cardStatusLog.findMany({
      where: { cardId },
      orderBy: { movedAt: 'asc' },
    });

    if (logs.length === 0) {
      return [];
    }

    const results: CycleTimeDataPoint[] = [];
    const columnIds = [...new Set(logs.map((l) => l.toColumnId))];
    const columns = await this.prisma.column.findMany({
      where: { id: { in: columnIds } },
      select: { id: true, title: true },
    });
    const columnTitleMap = new Map(columns.map((c) => [c.id, c.title]));

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];
      const nextEntry = logs[i + 1] ?? null;
      const enteredAt = entry.movedAt;
      const exitedAt = nextEntry ? nextEntry.movedAt : null;
      const durationHours = exitedAt
        ? (exitedAt.getTime() - enteredAt.getTime()) / (1000 * 60 * 60)
        : 0;

      results.push({
        columnId: entry.toColumnId,
        columnTitle: columnTitleMap.get(entry.toColumnId) ?? 'Unknown',
        durationHours: Math.round(durationHours * 100) / 100,
        enteredAt,
        exitedAt,
      });
    }

    return results;
  }
}
