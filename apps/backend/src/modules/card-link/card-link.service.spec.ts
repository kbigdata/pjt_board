import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LinkType } from '@prisma/client';
import { CardLinkService } from './card-link.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CardLinkService', () => {
  let service: CardLinkService;
  let prisma: Record<string, any>;

  const mockSourceCard = { id: 'card-1', boardId: 'board-1', title: 'Source Card', cardNumber: 1 };
  const mockTargetCard = { id: 'card-2', boardId: 'board-1', title: 'Target Card', cardNumber: 2 };

  const mockLink = {
    id: 'link-1',
    sourceCardId: 'card-1',
    targetCardId: 'card-2',
    linkType: LinkType.BLOCKS,
    createdAt: new Date(),
    sourceCard: { id: 'card-1', title: 'Source Card', cardNumber: 1 },
    targetCard: { id: 'card-2', title: 'Target Card', cardNumber: 2 },
  };

  const mockTransaction = jest.fn();

  beforeEach(async () => {
    mockTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const tx = {
        cardLink: {
          create: jest.fn().mockResolvedValue(mockLink),
          upsert: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    prisma = {
      card: { findUnique: jest.fn() },
      cardLink: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: mockTransaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardLinkService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CardLinkService>(CardLinkService);
  });

  describe('create', () => {
    it('should create a BLOCKS link and reverse BLOCKED_BY link', async () => {
      prisma.card.findUnique
        .mockResolvedValueOnce(mockSourceCard)
        .mockResolvedValueOnce(mockTargetCard);

      const result = await service.create('card-1', 'card-2', LinkType.BLOCKS, 'user-1');

      expect(result).toEqual(mockLink);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should create a RELATES_TO link without reverse link', async () => {
      const relatesLink = { ...mockLink, linkType: LinkType.RELATES_TO };
      prisma.card.findUnique
        .mockResolvedValueOnce(mockSourceCard)
        .mockResolvedValueOnce(mockTargetCard);

      mockTransaction.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          cardLink: {
            create: jest.fn().mockResolvedValue(relatesLink),
            upsert: jest.fn(),
          },
        };
        const result = await callback(tx);
        expect(tx.cardLink.upsert).not.toHaveBeenCalled();
        return result;
      });

      const result = await service.create('card-1', 'card-2', LinkType.RELATES_TO, 'user-1');

      expect(result.linkType).toBe(LinkType.RELATES_TO);
    });

    it('should throw NotFoundException for non-existent source card', async () => {
      prisma.card.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('non-existent', 'card-2', LinkType.BLOCKS, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent target card', async () => {
      prisma.card.findUnique
        .mockResolvedValueOnce(mockSourceCard)
        .mockResolvedValueOnce(null);

      await expect(
        service.create('card-1', 'non-existent', LinkType.BLOCKS, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCardId', () => {
    it('should return all links where card is source or target', async () => {
      prisma.cardLink.findMany.mockResolvedValue([mockLink]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(prisma.cardLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ sourceCardId: 'card-1' }, { targetCardId: 'card-1' }],
          },
        }),
      );
    });

    it('should return empty array when no links', async () => {
      prisma.cardLink.findMany.mockResolvedValue([]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete a BLOCKS link and its reverse BLOCKED_BY', async () => {
      prisma.cardLink.findUnique.mockResolvedValue(mockLink);

      await service.delete('link-1', 'user-1');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should delete a BLOCKED_BY link and its reverse BLOCKS', async () => {
      const blockedByLink = {
        ...mockLink,
        id: 'link-2',
        linkType: LinkType.BLOCKED_BY,
        sourceCardId: 'card-2',
        targetCardId: 'card-1',
      };
      prisma.cardLink.findUnique.mockResolvedValue(blockedByLink);

      mockTransaction.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          cardLink: {
            delete: jest.fn().mockResolvedValue({}),
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        const result = await callback(tx);
        expect(tx.cardLink.deleteMany).toHaveBeenCalledWith({
          where: {
            sourceCardId: 'card-1',
            targetCardId: 'card-2',
            linkType: LinkType.BLOCKS,
          },
        });
        return result;
      });

      await service.delete('link-2', 'user-1');
    });

    it('should throw NotFoundException for non-existent link', async () => {
      prisma.cardLink.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSourceCardId', () => {
    it('should return sourceCardId', async () => {
      prisma.cardLink.findUnique.mockResolvedValue({ sourceCardId: 'card-1' });

      expect(await service.getSourceCardId('link-1')).toBe('card-1');
    });

    it('should return null for non-existent link', async () => {
      prisma.cardLink.findUnique.mockResolvedValue(null);

      expect(await service.getSourceCardId('non-existent')).toBeNull();
    });
  });
});
