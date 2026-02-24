import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CommentService', () => {
  let service: CommentService;
  let prisma: Record<string, any>;

  const mockCard = { id: 'card-1', boardId: 'board-1' };
  const mockComment = {
    id: 'comment-1',
    cardId: 'card-1',
    authorId: 'user-1',
    content: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      card: { findUnique: jest.fn() },
      comment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  describe('create', () => {
    it('should create comment', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('card-1', 'user-1', { content: 'Test comment' });

      expect(result.content).toBe('Test comment');
    });

    it('should throw NotFoundException for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', 'user-1', { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByCardId', () => {
    it('should return comments', async () => {
      prisma.comment.findMany.mockResolvedValue([mockComment]);

      const result = await service.findAllByCardId('card-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.comment.update.mockResolvedValue({ ...mockComment, content: 'Updated' });

      const result = await service.update('comment-1', 'user-1', { content: 'Updated' });

      expect(result.content).toBe('Updated');
    });

    it('should throw ForbiddenException for other user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);

      await expect(
        service.update('comment-1', 'user-2', { content: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-1', { content: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.comment.delete.mockResolvedValue(mockComment);

      await service.delete('comment-1', 'user-1');

      expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'comment-1' } });
    });

    it('should throw ForbiddenException for other user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);

      await expect(service.delete('comment-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCardId', () => {
    it('should return cardId', async () => {
      prisma.comment.findUnique.mockResolvedValue({ cardId: 'card-1' });

      expect(await service.getCardId('comment-1')).toBe('card-1');
    });

    it('should return null', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      expect(await service.getCardId('non-existent')).toBeNull();
    });
  });
});
