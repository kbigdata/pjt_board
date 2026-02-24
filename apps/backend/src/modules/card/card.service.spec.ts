import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { CardService } from './card.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CardService', () => {
  let service: CardService;
  let prisma: Record<string, any>;

  const mockBoard = { id: 'board-1', workspaceId: 'ws-1', title: 'Board' };
  const mockColumn = { id: 'col-1', boardId: 'board-1', title: 'To Do' };

  const mockCard = {
    id: 'card-1',
    boardId: 'board-1',
    columnId: 'col-1',
    swimlaneId: null,
    cardNumber: 1,
    title: 'Test Card',
    description: 'Test description',
    priority: Priority.MEDIUM,
    position: 1024,
    coverColor: null,
    coverImageUrl: null,
    startDate: null,
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    createdById: 'user-1',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      board: { findUnique: jest.fn() },
      column: { findUnique: jest.fn() },
      card: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      cardAssignee: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  describe('createForUser', () => {
    it('should create card with auto-increment number and position', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.card.findFirst.mockResolvedValue(null);
      prisma.card.aggregate.mockResolvedValue({ _max: { cardNumber: 5 } });
      prisma.card.create.mockResolvedValue({ ...mockCard, cardNumber: 6 });

      const result = await service.createForUser('board-1', 'user-1', {
        title: 'Test Card',
        columnId: 'col-1',
      });

      expect(result.cardNumber).toBe(6);
      expect(prisma.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boardId: 'board-1',
          columnId: 'col-1',
          createdById: 'user-1',
          cardNumber: 6,
          position: 1024,
        }),
        include: expect.any(Object),
      });
    });

    it('should position after last card in column', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.card.findFirst.mockResolvedValue({ position: 2048 });
      prisma.card.aggregate.mockResolvedValue({ _max: { cardNumber: 0 } });
      prisma.card.create.mockResolvedValue({ ...mockCard, position: 3072 });

      const result = await service.createForUser('board-1', 'user-1', {
        title: 'Card',
        columnId: 'col-1',
      });

      expect(result.position).toBe(3072);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.createForUser('non-existent', 'user-1', { title: 'X', columnId: 'col-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for column not in board', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.column.findUnique.mockResolvedValue({ ...mockColumn, boardId: 'other-board' });

      await expect(
        service.createForUser('board-1', 'user-1', { title: 'X', columnId: 'col-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findArchivedByBoardId', () => {
    it('should return only archived cards', async () => {
      const archivedCard = { ...mockCard, archivedAt: new Date() };
      prisma.card.findMany.mockResolvedValue([archivedCard]);

      const result = await service.findArchivedByBoardId('board-1');

      expect(result).toHaveLength(1);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 'board-1', archivedAt: { not: null } },
        }),
      );
    });

    it('should return empty array when no archived cards', async () => {
      prisma.card.findMany.mockResolvedValue([]);

      const result = await service.findArchivedByBoardId('board-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findAllByBoardId', () => {
    it('should return non-archived cards', async () => {
      prisma.card.findMany.mockResolvedValue([mockCard]);

      const result = await service.findAllByBoardId('board-1');

      expect(result).toHaveLength(1);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 'board-1', archivedAt: null },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return card with full details', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);

      const result = await service.findById('card-1');

      expect(result.id).toBe('card-1');
    });

    it('should throw NotFoundException', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update card fields', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.card.update.mockResolvedValue({ ...mockCard, title: 'Updated', priority: Priority.HIGH });

      const result = await service.update('card-1', { title: 'Updated', priority: Priority.HIGH });

      expect(result.title).toBe('Updated');
      expect(result.priority).toBe(Priority.HIGH);
    });

    it('should throw NotFoundException', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('move', () => {
    it('should update column and position', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.card.update.mockResolvedValue({ ...mockCard, columnId: 'col-2', position: 2048 });

      const result = await service.move('card-1', {
        columnId: 'col-2',
        position: 2048,
      });

      expect(result.columnId).toBe('col-2');
      expect(result.position).toBe(2048);
    });

    it('should throw NotFoundException', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(
        service.move('non-existent', { columnId: 'col-1', position: 1024 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should set archivedAt', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.card.update.mockResolvedValue({ ...mockCard, archivedAt: new Date() });

      const result = await service.archive('card-1');

      expect(result.archivedAt).toBeTruthy();
    });

    it('should throw NotFoundException', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.archive('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should clear archivedAt', async () => {
      prisma.card.findUnique.mockResolvedValue({ ...mockCard, archivedAt: new Date() });
      prisma.card.update.mockResolvedValue({ ...mockCard, archivedAt: null });

      const result = await service.restore('card-1');

      expect(result.archivedAt).toBeNull();
    });
  });

  describe('delete', () => {
    it('should permanently delete card', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.card.delete.mockResolvedValue(mockCard);

      await service.delete('card-1');

      expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
    });

    it('should throw NotFoundException', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoardId', () => {
    it('should return boardId', async () => {
      prisma.card.findUnique.mockResolvedValue({ boardId: 'board-1' });

      expect(await service.getBoardId('card-1')).toBe('board-1');
    });

    it('should return null for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      expect(await service.getBoardId('non-existent')).toBeNull();
    });
  });

  describe('addAssignee', () => {
    it('should add assignee', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.cardAssignee.create.mockResolvedValue({
        id: 'ca-1',
        cardId: 'card-1',
        userId: 'user-2',
        user: { id: 'user-2', name: 'User 2', email: 'u2@test.com', avatarUrl: null },
      });

      const result = await service.addAssignee('card-1', 'user-2');

      expect(result.userId).toBe('user-2');
    });

    it('should throw NotFoundException for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.addAssignee('non-existent', 'user-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAssignee', () => {
    it('should remove assignee', async () => {
      prisma.cardAssignee.findUnique.mockResolvedValue({ id: 'ca-1', cardId: 'card-1', userId: 'user-2' });
      prisma.cardAssignee.delete.mockResolvedValue({});

      await service.removeAssignee('card-1', 'user-2');

      expect(prisma.cardAssignee.delete).toHaveBeenCalledWith({ where: { id: 'ca-1' } });
    });

    it('should throw NotFoundException for non-existent assignee', async () => {
      prisma.cardAssignee.findUnique.mockResolvedValue(null);

      await expect(service.removeAssignee('card-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
