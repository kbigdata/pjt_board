import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChecklistService', () => {
  let service: ChecklistService;
  let prisma: Record<string, any>;

  const mockCard = { id: 'card-1', boardId: 'board-1' };
  const mockChecklist = {
    id: 'cl-1',
    cardId: 'card-1',
    title: 'QA Checklist',
    position: 1024,
    createdAt: new Date(),
  };
  const mockItem = {
    id: 'cli-1',
    checklistId: 'cl-1',
    title: 'Verify login',
    isChecked: false,
    position: 1024,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      card: { findUnique: jest.fn() },
      checklist: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      checklistItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChecklistService>(ChecklistService);
  });

  describe('create', () => {
    it('should create checklist with auto position', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.checklist.findFirst.mockResolvedValue(null);
      prisma.checklist.create.mockResolvedValue({ ...mockChecklist, items: [] });

      const result = await service.create('card-1', { title: 'QA Checklist' });

      expect(result.title).toBe('QA Checklist');
      expect(prisma.checklist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ cardId: 'card-1', position: 1024 }),
        include: { items: true },
      });
    });

    it('should throw NotFoundException for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByCardId', () => {
    it('should return checklists with items', async () => {
      prisma.checklist.findMany.mockResolvedValue([{ ...mockChecklist, items: [mockItem] }]);

      const result = await service.findAllByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update checklist title', async () => {
      prisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      prisma.checklist.update.mockResolvedValue({ ...mockChecklist, title: 'Updated', items: [] });

      const result = await service.update('cl-1', { title: 'Updated' });

      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete checklist', async () => {
      prisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      prisma.checklist.delete.mockResolvedValue(mockChecklist);

      await service.delete('cl-1');

      expect(prisma.checklist.delete).toHaveBeenCalledWith({ where: { id: 'cl-1' } });
    });

    it('should throw NotFoundException', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    it('should add item with auto position', async () => {
      prisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      prisma.checklistItem.findFirst.mockResolvedValue(null);
      prisma.checklistItem.create.mockResolvedValue(mockItem);

      const result = await service.addItem('cl-1', { title: 'Verify login' });

      expect(result.title).toBe('Verify login');
    });

    it('should throw NotFoundException for non-existent checklist', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('non-existent', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleItem', () => {
    it('should toggle isChecked', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue(mockItem);
      prisma.checklistItem.update.mockResolvedValue({ ...mockItem, isChecked: true });

      const result = await service.toggleItem('cli-1');

      expect(result.isChecked).toBe(true);
      expect(prisma.checklistItem.update).toHaveBeenCalledWith({
        where: { id: 'cli-1' },
        data: { isChecked: true },
      });
    });

    it('should throw NotFoundException', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue(null);

      await expect(service.toggleItem('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteItem', () => {
    it('should delete item', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue(mockItem);
      prisma.checklistItem.delete.mockResolvedValue(mockItem);

      await service.deleteItem('cli-1');

      expect(prisma.checklistItem.delete).toHaveBeenCalledWith({ where: { id: 'cli-1' } });
    });

    it('should throw NotFoundException', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue(null);

      await expect(service.deleteItem('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCardId', () => {
    it('should return cardId', async () => {
      prisma.checklist.findUnique.mockResolvedValue({ cardId: 'card-1' });

      expect(await service.getCardId('cl-1')).toBe('card-1');
    });

    it('should return null', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      expect(await service.getCardId('non-existent')).toBeNull();
    });
  });

  describe('getCardIdFromItem', () => {
    it('should return cardId via checklist', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue({
        checklist: { cardId: 'card-1' },
      });

      expect(await service.getCardIdFromItem('cli-1')).toBe('card-1');
    });

    it('should return null', async () => {
      prisma.checklistItem.findUnique.mockResolvedValue(null);

      expect(await service.getCardIdFromItem('non-existent')).toBeNull();
    });
  });
});
