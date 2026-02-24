import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ColumnType } from '@prisma/client';
import { ColumnService } from './column.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ColumnService', () => {
  let service: ColumnService;
  let prisma: Record<string, any>;

  const mockBoard = {
    id: 'board-1',
    workspaceId: 'ws-1',
    title: 'Sprint Board',
  };

  const mockColumn = {
    id: 'col-1',
    boardId: 'board-1',
    title: 'To Do',
    columnType: ColumnType.TODO,
    position: 1024,
    wipLimit: null,
    color: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      board: {
        findUnique: jest.fn(),
      },
      column: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      card: {
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
  });

  describe('create', () => {
    it('should create column with auto position', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.column.findFirst.mockResolvedValue(null);
      prisma.column.create.mockResolvedValue(mockColumn);

      const result = await service.create('board-1', { title: 'To Do', columnType: ColumnType.TODO });

      expect(result).toEqual(mockColumn);
      expect(prisma.column.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boardId: 'board-1',
          title: 'To Do',
          position: 1024,
        }),
      });
    });

    it('should position after last column', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.column.findFirst.mockResolvedValue({ position: 2048 });
      prisma.column.create.mockResolvedValue({ ...mockColumn, position: 3072 });

      const result = await service.create('board-1', { title: 'Done' });

      expect(result.position).toBe(3072);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', { title: 'Col' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByBoardId', () => {
    it('should return non-archived columns with card count', async () => {
      prisma.column.findMany.mockResolvedValue([
        { ...mockColumn, _count: { cards: 3 } },
      ]);

      const result = await service.findAllByBoardId('board-1');

      expect(result).toHaveLength(1);
      expect(prisma.column.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 'board-1', archivedAt: null },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return column with cards', async () => {
      prisma.column.findUnique.mockResolvedValue({ ...mockColumn, cards: [] });

      const result = await service.findById('col-1');

      expect(result.id).toBe('col-1');
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update column fields', async () => {
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.column.update.mockResolvedValue({ ...mockColumn, title: 'In Progress', wipLimit: 5 });

      const result = await service.update('col-1', { title: 'In Progress', wipLimit: 5 });

      expect(result.title).toBe('In Progress');
      expect(result.wipLimit).toBe(5);
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('move', () => {
    it('should update position', async () => {
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.column.update.mockResolvedValue({ ...mockColumn, position: 1536 });

      const result = await service.move('col-1', 1536);

      expect(result.position).toBe(1536);
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.move('non-existent', 1024)).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should set archivedAt', async () => {
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.column.update.mockResolvedValue({ ...mockColumn, archivedAt: new Date() });

      const result = await service.archive('col-1');

      expect(result.archivedAt).toBeTruthy();
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.archive('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should clear archivedAt', async () => {
      prisma.column.findUnique.mockResolvedValue({ ...mockColumn, archivedAt: new Date() });
      prisma.column.update.mockResolvedValue({ ...mockColumn, archivedAt: null });

      const result = await service.restore('col-1');

      expect(result.archivedAt).toBeNull();
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.restore('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWithMigration', () => {
    const mockCard1 = { id: 'card-1', position: 1024 };
    const mockCard2 = { id: 'card-2', position: 2048 };

    it('should delete column with no cards directly', async () => {
      prisma.column.findUnique.mockResolvedValue({ ...mockColumn, cards: [] });
      prisma.column.delete.mockResolvedValue(mockColumn);

      await service.deleteWithMigration('col-1');

      expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: 'col-1' } });
    });

    it('should migrate cards to target column before deleting', async () => {
      const sourceColumn = { ...mockColumn, cards: [mockCard1, mockCard2] };
      const targetColumn = {
        id: 'col-2',
        title: 'Done',
        cards: [{ position: 3072 }],
      };

      prisma.column.findUnique
        .mockResolvedValueOnce(sourceColumn)
        .mockResolvedValueOnce(targetColumn);
      prisma.card.update.mockResolvedValue({});
      prisma.column.delete.mockResolvedValue(mockColumn);

      await service.deleteWithMigration('col-1', 'col-2');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { columnId: 'col-2', position: 4096 },
      });
      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-2' },
        data: { columnId: 'col-2', position: 5120 },
      });
      expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: 'col-1' } });
    });

    it('should migrate cards to empty target column starting at 1024', async () => {
      const sourceColumn = { ...mockColumn, cards: [mockCard1] };
      const targetColumn = { id: 'col-2', title: 'Done', cards: [] };

      prisma.column.findUnique
        .mockResolvedValueOnce(sourceColumn)
        .mockResolvedValueOnce(targetColumn);
      prisma.card.update.mockResolvedValue({});
      prisma.column.delete.mockResolvedValue(mockColumn);

      await service.deleteWithMigration('col-1', 'col-2');

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { columnId: 'col-2', position: 1024 },
      });
    });

    it('should throw BadRequestException when column has cards and no targetColumnId', async () => {
      prisma.column.findUnique.mockResolvedValue({ ...mockColumn, cards: [mockCard1] });

      await expect(service.deleteWithMigration('col-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.deleteWithMigration('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent target column', async () => {
      const sourceColumn = { ...mockColumn, cards: [mockCard1] };
      prisma.column.findUnique
        .mockResolvedValueOnce(sourceColumn)
        .mockResolvedValueOnce(null);

      await expect(service.deleteWithMigration('col-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBoardId', () => {
    it('should return boardId for existing column', async () => {
      prisma.column.findUnique.mockResolvedValue({ boardId: 'board-1' });

      const result = await service.getBoardId('col-1');

      expect(result).toBe('board-1');
    });

    it('should return null for non-existent column', async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      const result = await service.getBoardId('non-existent');

      expect(result).toBeNull();
    });
  });
});
