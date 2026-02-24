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
  const mockReaction = {
    id: 'reaction-1',
    commentId: 'comment-1',
    userId: 'user-1',
    emoji: 'thumbsup',
    createdAt: new Date(),
    user: { id: 'user-1', name: 'Alice', avatarUrl: null },
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
      commentReaction: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
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

  describe('addReaction', () => {
    it('should upsert and return reaction', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentReaction.upsert.mockResolvedValue(mockReaction);

      const result = await service.addReaction('comment-1', 'user-1', 'thumbsup');

      expect(prisma.commentReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            commentId_userId_emoji: { commentId: 'comment-1', userId: 'user-1', emoji: 'thumbsup' },
          },
          create: { commentId: 'comment-1', userId: 'user-1', emoji: 'thumbsup' },
          update: {},
        }),
      );
      expect(result.emoji).toBe('thumbsup');
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.addReaction('non-existent', 'user-1', 'thumbsup')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeReaction', () => {
    it('should delete reaction', async () => {
      prisma.commentReaction.findUnique.mockResolvedValue(mockReaction);
      prisma.commentReaction.delete.mockResolvedValue(mockReaction);

      await service.removeReaction('comment-1', 'user-1', 'thumbsup');

      expect(prisma.commentReaction.delete).toHaveBeenCalledWith({
        where: {
          commentId_userId_emoji: { commentId: 'comment-1', userId: 'user-1', emoji: 'thumbsup' },
        },
      });
    });

    it('should throw NotFoundException when reaction does not exist', async () => {
      prisma.commentReaction.findUnique.mockResolvedValue(null);

      await expect(
        service.removeReaction('comment-1', 'user-1', 'thumbsup'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReactions', () => {
    it('should return reactions grouped by emoji', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentReaction.findMany.mockResolvedValue([
        { ...mockReaction, emoji: 'thumbsup', user: { id: 'user-1', name: 'Alice', avatarUrl: null } },
        { ...mockReaction, id: 'reaction-2', userId: 'user-2', emoji: 'thumbsup', user: { id: 'user-2', name: 'Bob', avatarUrl: null } },
        { ...mockReaction, id: 'reaction-3', userId: 'user-1', emoji: 'heart', user: { id: 'user-1', name: 'Alice', avatarUrl: null } },
      ]);

      const result = await service.getReactions('comment-1');

      expect(result).toHaveLength(2);
      const thumbsup = result.find((r) => r.emoji === 'thumbsup');
      const heart = result.find((r) => r.emoji === 'heart');
      expect(thumbsup?.count).toBe(2);
      expect(thumbsup?.users).toHaveLength(2);
      expect(heart?.count).toBe(1);
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.getReactions('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no reactions', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentReaction.findMany.mockResolvedValue([]);

      const result = await service.getReactions('comment-1');

      expect(result).toHaveLength(0);
    });
  });
});
