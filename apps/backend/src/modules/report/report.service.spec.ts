import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ColumnType } from '@prisma/client';

const mockPrisma = {
  column: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  card: {
    count: jest.fn(),
  },
  columnSnapshot: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  cardStatusLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    jest.clearAllMocks();
  });

  describe('takeSnapshot', () => {
    it('should create snapshots for each column', async () => {
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-1' },
        { id: 'col-2' },
      ]);
      mockPrisma.card.count.mockResolvedValueOnce(3).mockResolvedValueOnce(5);
      mockPrisma.columnSnapshot.upsert.mockResolvedValue({});

      await service.takeSnapshot('board-1');

      expect(mockPrisma.card.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.columnSnapshot.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.columnSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ columnId_date: expect.any(Object) }),
          create: expect.objectContaining({ boardId: 'board-1', columnId: 'col-1', cardCount: 3 }),
          update: { cardCount: 3 },
        }),
      );
    });

    it('should not upsert when board has no columns', async () => {
      mockPrisma.column.findMany.mockResolvedValue([]);

      await service.takeSnapshot('board-empty');

      expect(mockPrisma.columnSnapshot.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getCFDData', () => {
    it('should return empty array when no snapshots exist', async () => {
      mockPrisma.columnSnapshot.findMany.mockResolvedValue([]);
      mockPrisma.column.findMany.mockResolvedValue([]);

      const result = await service.getCFDData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual([]);
    });

    it('should group snapshots by date and attach column titles', async () => {
      const date1 = new Date('2026-01-10T00:00:00.000Z');
      const date2 = new Date('2026-01-11T00:00:00.000Z');

      mockPrisma.columnSnapshot.findMany.mockResolvedValue([
        { columnId: 'col-1', cardCount: 3, date: date1 },
        { columnId: 'col-2', cardCount: 2, date: date1 },
        { columnId: 'col-1', cardCount: 4, date: date2 },
      ]);
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-1', title: 'To Do' },
        { id: 'col-2', title: 'Done' },
      ]);

      const result = await service.getCFDData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-01-10');
      expect(result[0].columns).toHaveLength(2);
      expect(result[0].columns[0]).toEqual({
        columnId: 'col-1',
        columnTitle: 'To Do',
        count: 3,
      });
      expect(result[1].date).toBe('2026-01-11');
      expect(result[1].columns).toHaveLength(1);
    });
  });

  describe('logCardMove', () => {
    it('should create a CardStatusLog entry', async () => {
      mockPrisma.cardStatusLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logCardMove('card-1', 'board-1', 'col-1', 'col-2');

      expect(mockPrisma.cardStatusLog.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          boardId: 'board-1',
          fromColumnId: 'col-1',
          toColumnId: 'col-2',
        },
      });
    });

    it('should handle undefined fromColumnId', async () => {
      mockPrisma.cardStatusLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logCardMove('card-1', 'board-1', undefined, 'col-2');

      expect(mockPrisma.cardStatusLog.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          boardId: 'board-1',
          fromColumnId: null,
          toColumnId: 'col-2',
        },
      });
    });
  });

  describe('getLeadTimeData', () => {
    it('should return empty array when no DONE columns exist', async () => {
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-1', columnType: ColumnType.TODO, title: 'To Do' },
      ]);
      mockPrisma.cardStatusLog.findMany.mockResolvedValue([]);

      const result = await service.getLeadTimeData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual([]);
    });

    it('should calculate lead time from first TODO entry to DONE entry', async () => {
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-todo', columnType: ColumnType.TODO, title: 'To Do' },
        { id: 'col-done', columnType: ColumnType.DONE, title: 'Done' },
      ]);

      const startTime = new Date('2026-01-10T09:00:00.000Z');
      const endTime = new Date('2026-01-12T09:00:00.000Z'); // 48 hours later

      mockPrisma.cardStatusLog.findMany.mockResolvedValue([
        {
          cardId: 'card-1',
          toColumnId: 'col-todo',
          movedAt: startTime,
          card: { id: 'card-1', title: 'My Task' },
        },
        {
          cardId: 'card-1',
          toColumnId: 'col-done',
          movedAt: endTime,
          card: { id: 'card-1', title: 'My Task' },
        },
      ]);

      const result = await service.getLeadTimeData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].cardId).toBe('card-1');
      expect(result[0].cardTitle).toBe('My Task');
      expect(result[0].leadTimeHours).toBe(48);
    });

    it('should exclude cards that did not reach a DONE column', async () => {
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-todo', columnType: ColumnType.TODO, title: 'To Do' },
        { id: 'col-done', columnType: ColumnType.DONE, title: 'Done' },
      ]);

      mockPrisma.cardStatusLog.findMany.mockResolvedValue([
        {
          cardId: 'card-1',
          toColumnId: 'col-todo',
          movedAt: new Date('2026-01-10T09:00:00.000Z'),
          card: { id: 'card-1', title: 'In Progress Task' },
        },
      ]);

      const result = await service.getLeadTimeData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getThroughputData', () => {
    it('should return empty array when no DONE columns exist', async () => {
      mockPrisma.column.findMany.mockResolvedValue([]);

      const result = await service.getThroughputData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual([]);
    });

    it('should count cards entering DONE column per day', async () => {
      mockPrisma.column.findMany.mockResolvedValue([
        { id: 'col-done', columnType: ColumnType.DONE },
      ]);

      mockPrisma.cardStatusLog.findMany.mockResolvedValue([
        { cardId: 'c1', toColumnId: 'col-done', movedAt: new Date('2026-01-10T10:00:00.000Z') },
        { cardId: 'c2', toColumnId: 'col-done', movedAt: new Date('2026-01-10T14:00:00.000Z') },
        { cardId: 'c3', toColumnId: 'col-done', movedAt: new Date('2026-01-11T09:00:00.000Z') },
      ]);

      const result = await service.getThroughputData(
        'board-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2026-01-10', count: 2 });
      expect(result[1]).toEqual({ date: '2026-01-11', count: 1 });
    });
  });
});
