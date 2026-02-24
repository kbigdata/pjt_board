import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CardTagService } from './card-tag.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CardTagService', () => {
  let service: CardTagService;
  let prisma: Record<string, any>;

  const mockCard = { id: 'card-1', boardId: 'board-1' };

  const mockTag = {
    id: 'tag-1',
    cardId: 'card-1',
    tag: 'urgent',
  };

  beforeEach(async () => {
    prisma = {
      card: { findUnique: jest.fn() },
      cardTag: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardTagService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CardTagService>(CardTagService);
  });

  describe('addTag', () => {
    it('should add tag to card', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.cardTag.upsert.mockResolvedValue(mockTag);

      const result = await service.addTag('card-1', 'urgent');

      expect(result.tag).toBe('urgent');
      expect(prisma.cardTag.upsert).toHaveBeenCalledWith({
        where: { cardId_tag: { cardId: 'card-1', tag: 'urgent' } },
        create: { cardId: 'card-1', tag: 'urgent' },
        update: {},
      });
    });

    it('should upsert (not duplicate) existing tag', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.cardTag.upsert.mockResolvedValue(mockTag);

      await service.addTag('card-1', 'urgent');
      await service.addTag('card-1', 'urgent');

      expect(prisma.cardTag.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.addTag('non-existent', 'urgent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCardId', () => {
    it('should return all tags for card', async () => {
      prisma.cardTag.findMany.mockResolvedValue([mockTag]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(prisma.cardTag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cardId: 'card-1' },
        }),
      );
    });

    it('should return empty array when no tags', async () => {
      prisma.cardTag.findMany.mockResolvedValue([]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('removeTag', () => {
    it('should remove tag from card', async () => {
      prisma.cardTag.findUnique.mockResolvedValue(mockTag);
      prisma.cardTag.delete.mockResolvedValue(mockTag);

      await service.removeTag('card-1', 'urgent');

      expect(prisma.cardTag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
    });

    it('should throw NotFoundException when tag not on card', async () => {
      prisma.cardTag.findUnique.mockResolvedValue(null);

      await expect(service.removeTag('card-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCardId', () => {
    it('should return cardId for existing tag', async () => {
      prisma.cardTag.findUnique.mockResolvedValue({ cardId: 'card-1' });

      expect(await service.getCardId('tag-1')).toBe('card-1');
    });

    it('should return null for non-existent tag', async () => {
      prisma.cardTag.findUnique.mockResolvedValue(null);

      expect(await service.getCardId('non-existent')).toBeNull();
    });
  });
});
