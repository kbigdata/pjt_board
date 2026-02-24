import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SavedFilterService } from './saved-filter.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SavedFilterService', () => {
  let service: SavedFilterService;
  let prisma: Record<string, any>;

  const mockFilter = {
    id: 'filter-1',
    boardId: 'board-1',
    userId: 'user-1',
    name: 'High Priority',
    filters: { priority: ['HIGH', 'CRITICAL'] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      savedFilter: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedFilterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SavedFilterService>(SavedFilterService);
  });

  describe('create', () => {
    it('should create a saved filter', async () => {
      prisma.savedFilter.create.mockResolvedValue(mockFilter);

      const result = await service.create('board-1', 'user-1', {
        name: 'High Priority',
        filters: { priority: ['HIGH', 'CRITICAL'] },
      });

      expect(prisma.savedFilter.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          userId: 'user-1',
          name: 'High Priority',
          filters: { priority: ['HIGH', 'CRITICAL'] },
        },
      });
      expect(result.name).toBe('High Priority');
    });
  });

  describe('findByBoardAndUser', () => {
    it('should return saved filters for a board and user', async () => {
      prisma.savedFilter.findMany.mockResolvedValue([mockFilter]);

      const result = await service.findByBoardAndUser('board-1', 'user-1');

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1', userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('High Priority');
    });

    it('should return empty array when no filters exist', async () => {
      prisma.savedFilter.findMany.mockResolvedValue([]);

      const result = await service.findByBoardAndUser('board-1', 'user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update a saved filter', async () => {
      const updated = { ...mockFilter, name: 'Updated Name' };
      prisma.savedFilter.findUnique.mockResolvedValue(mockFilter);
      prisma.savedFilter.update.mockResolvedValue(updated);

      const result = await service.update('filter-1', 'user-1', { name: 'Updated Name' });

      expect(prisma.savedFilter.update).toHaveBeenCalledWith({
        where: { id: 'filter-1' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update filters object only', async () => {
      const newFilters = { priority: ['LOW'] };
      const updated = { ...mockFilter, filters: newFilters };
      prisma.savedFilter.findUnique.mockResolvedValue(mockFilter);
      prisma.savedFilter.update.mockResolvedValue(updated);

      const result = await service.update('filter-1', 'user-1', { filters: newFilters });

      expect(prisma.savedFilter.update).toHaveBeenCalledWith({
        where: { id: 'filter-1' },
        data: { filters: newFilters },
      });
      expect(result.filters).toEqual(newFilters);
    });

    it('should throw NotFoundException when filter does not exist', async () => {
      prisma.savedFilter.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the filter', async () => {
      prisma.savedFilter.findUnique.mockResolvedValue(mockFilter);

      await expect(
        service.update('filter-1', 'user-2', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a saved filter', async () => {
      prisma.savedFilter.findUnique.mockResolvedValue(mockFilter);
      prisma.savedFilter.delete.mockResolvedValue(mockFilter);

      await service.delete('filter-1', 'user-1');

      expect(prisma.savedFilter.delete).toHaveBeenCalledWith({ where: { id: 'filter-1' } });
    });

    it('should throw NotFoundException when filter does not exist', async () => {
      prisma.savedFilter.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the filter', async () => {
      prisma.savedFilter.findUnique.mockResolvedValue(mockFilter);

      await expect(service.delete('filter-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });
});
