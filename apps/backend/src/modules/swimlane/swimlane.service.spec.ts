import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SwimlaneService } from './swimlane.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SwimlaneService', () => {
  let service: SwimlaneService;
  let prisma: Record<string, any>;

  const mockBoard = {
    id: 'board-1',
    workspaceId: 'ws-1',
    title: 'Sprint Board',
  };

  const mockSwimlane = {
    id: 'sw-1',
    boardId: 'board-1',
    title: 'Frontend',
    position: 1024,
    color: null,
    isDefault: false,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      board: {
        findUnique: jest.fn(),
      },
      swimlane: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwimlaneService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SwimlaneService>(SwimlaneService);
  });

  describe('create', () => {
    it('should create swimlane with initial position 1024', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.swimlane.findFirst.mockResolvedValue(null);
      prisma.swimlane.create.mockResolvedValue(mockSwimlane);

      const result = await service.create('board-1', { title: 'Frontend' });

      expect(result).toEqual(mockSwimlane);
      expect(prisma.swimlane.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boardId: 'board-1',
          title: 'Frontend',
          position: 1024,
        }),
      });
    });

    it('should position after last swimlane', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.swimlane.findFirst.mockResolvedValue({ position: 2048 });
      prisma.swimlane.create.mockResolvedValue({ ...mockSwimlane, position: 3072 });

      const result = await service.create('board-1', { title: 'Backend' });

      expect(result.position).toBe(3072);
      expect(prisma.swimlane.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 3072 }),
      });
    });

    it('should create swimlane with optional color', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.swimlane.findFirst.mockResolvedValue(null);
      prisma.swimlane.create.mockResolvedValue({ ...mockSwimlane, color: '#3B82F6' });

      await service.create('board-1', { title: 'Frontend', color: '#3B82F6' });

      expect(prisma.swimlane.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ color: '#3B82F6' }),
      });
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.create('non-existent', { title: 'SW' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllByBoardId', () => {
    it('should return non-archived swimlanes ordered by position', async () => {
      prisma.swimlane.findMany.mockResolvedValue([
        { ...mockSwimlane, _count: { cards: 5 } },
      ]);

      const result = await service.findAllByBoardId('board-1');

      expect(result).toHaveLength(1);
      expect(prisma.swimlane.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 'board-1', archivedAt: null },
          orderBy: { position: 'asc' },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update swimlane title', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(mockSwimlane);
      prisma.swimlane.update.mockResolvedValue({ ...mockSwimlane, title: 'Backend' });

      const result = await service.update('sw-1', { title: 'Backend' });

      expect(result.title).toBe('Backend');
      expect(prisma.swimlane.update).toHaveBeenCalledWith({
        where: { id: 'sw-1' },
        data: { title: 'Backend' },
      });
    });

    it('should update swimlane color', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(mockSwimlane);
      prisma.swimlane.update.mockResolvedValue({ ...mockSwimlane, color: '#EF4444' });

      const result = await service.update('sw-1', { color: '#EF4444' });

      expect(result.color).toBe('#EF4444');
    });

    it('should throw NotFoundException for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('move', () => {
    it('should update position (fractional indexing)', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(mockSwimlane);
      prisma.swimlane.update.mockResolvedValue({ ...mockSwimlane, position: 1536 });

      const result = await service.move('sw-1', 1536);

      expect(result.position).toBe(1536);
      expect(prisma.swimlane.update).toHaveBeenCalledWith({
        where: { id: 'sw-1' },
        data: { position: 1536 },
      });
    });

    it('should throw NotFoundException for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      await expect(service.move('non-existent', 1024)).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should set archivedAt timestamp', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(mockSwimlane);
      prisma.swimlane.update.mockResolvedValue({ ...mockSwimlane, archivedAt: new Date() });

      const result = await service.archive('sw-1');

      expect(result.archivedAt).toBeTruthy();
      expect(prisma.swimlane.update).toHaveBeenCalledWith({
        where: { id: 'sw-1' },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      await expect(service.archive('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should clear archivedAt', async () => {
      prisma.swimlane.findUnique.mockResolvedValue({ ...mockSwimlane, archivedAt: new Date() });
      prisma.swimlane.update.mockResolvedValue({ ...mockSwimlane, archivedAt: null });

      const result = await service.restore('sw-1');

      expect(result.archivedAt).toBeNull();
      expect(prisma.swimlane.update).toHaveBeenCalledWith({
        where: { id: 'sw-1' },
        data: { archivedAt: null },
      });
    });

    it('should throw NotFoundException for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      await expect(service.restore('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete swimlane with no cards', async () => {
      prisma.swimlane.findUnique.mockResolvedValue({
        ...mockSwimlane,
        _count: { cards: 0 },
      });
      prisma.swimlane.delete.mockResolvedValue(mockSwimlane);

      await service.delete('sw-1');

      expect(prisma.swimlane.delete).toHaveBeenCalledWith({ where: { id: 'sw-1' } });
    });

    it('should throw BadRequestException when swimlane has cards', async () => {
      prisma.swimlane.findUnique.mockResolvedValue({
        ...mockSwimlane,
        _count: { cards: 3 },
      });

      await expect(service.delete('sw-1')).rejects.toThrow(BadRequestException);
      expect(prisma.swimlane.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoardId', () => {
    it('should return boardId for existing swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue({ boardId: 'board-1' });

      const result = await service.getBoardId('sw-1');

      expect(result).toBe('board-1');
    });

    it('should return null for non-existent swimlane', async () => {
      prisma.swimlane.findUnique.mockResolvedValue(null);

      const result = await service.getBoardId('non-existent');

      expect(result).toBeNull();
    });
  });
});
