import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LabelService } from './label.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LabelService', () => {
  let service: LabelService;
  let prisma: Record<string, any>;

  const mockBoard = { id: 'board-1' };
  const mockLabel = {
    id: 'label-1',
    boardId: 'board-1',
    name: 'Bug',
    color: '#EF4444',
    createdAt: new Date(),
  };
  const mockCard = { id: 'card-1', boardId: 'board-1' };

  beforeEach(async () => {
    prisma = {
      board: { findUnique: jest.fn() },
      label: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      card: { findUnique: jest.fn() },
      cardLabel: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LabelService>(LabelService);
  });

  describe('create', () => {
    it('should create label', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.label.create.mockResolvedValue(mockLabel);

      const result = await service.create('board-1', { name: 'Bug', color: '#EF4444' });

      expect(result.name).toBe('Bug');
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', { name: 'Bug', color: '#EF4444' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByBoardId', () => {
    it('should return labels', async () => {
      prisma.label.findMany.mockResolvedValue([mockLabel]);

      const result = await service.findAllByBoardId('board-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update label', async () => {
      prisma.label.findUnique.mockResolvedValue(mockLabel);
      prisma.label.update.mockResolvedValue({ ...mockLabel, name: 'Feature' });

      const result = await service.update('label-1', { name: 'Feature' });

      expect(result.name).toBe('Feature');
    });

    it('should throw NotFoundException', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete label', async () => {
      prisma.label.findUnique.mockResolvedValue(mockLabel);
      prisma.label.delete.mockResolvedValue(mockLabel);

      await service.delete('label-1');

      expect(prisma.label.delete).toHaveBeenCalledWith({ where: { id: 'label-1' } });
    });

    it('should throw NotFoundException', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addToCard', () => {
    it('should assign label to card', async () => {
      prisma.label.findUnique.mockResolvedValue(mockLabel);
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.cardLabel.findUnique.mockResolvedValue(null);
      prisma.cardLabel.create.mockResolvedValue({
        id: 'cl-1',
        cardId: 'card-1',
        labelId: 'label-1',
        label: mockLabel,
      });

      const result = await service.addToCard('label-1', 'card-1');

      expect(result.labelId).toBe('label-1');
    });

    it('should throw ConflictException for duplicate', async () => {
      prisma.label.findUnique.mockResolvedValue(mockLabel);
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.cardLabel.findUnique.mockResolvedValue({ id: 'cl-1' });

      await expect(service.addToCard('label-1', 'card-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent label', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.addToCard('non-existent', 'card-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFromCard', () => {
    it('should remove label from card', async () => {
      prisma.cardLabel.findUnique.mockResolvedValue({ id: 'cl-1' });
      prisma.cardLabel.delete.mockResolvedValue({});

      await service.removeFromCard('label-1', 'card-1');

      expect(prisma.cardLabel.delete).toHaveBeenCalledWith({ where: { id: 'cl-1' } });
    });

    it('should throw NotFoundException if not assigned', async () => {
      prisma.cardLabel.findUnique.mockResolvedValue(null);

      await expect(service.removeFromCard('label-1', 'card-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoardId', () => {
    it('should return boardId', async () => {
      prisma.label.findUnique.mockResolvedValue({ boardId: 'board-1' });

      expect(await service.getBoardId('label-1')).toBe('board-1');
    });

    it('should return null', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      expect(await service.getBoardId('non-existent')).toBeNull();
    });
  });
});
