import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cardId: string, authorId: string, dto: CreateCommentDto) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.comment.create({
      data: {
        cardId,
        authorId,
        content: dto.content,
      },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async findAllByCardId(cardId: string) {
    return this.prisma.comment.findMany({
      where: { cardId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });
  }

  async getCardId(commentId: string): Promise<string | null> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { cardId: true },
    });
    return comment?.cardId ?? null;
  }

  // ---------------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------------

  async addReaction(commentId: string, userId: string, emoji: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.prisma.commentReaction.upsert({
      where: {
        commentId_userId_emoji: { commentId, userId, emoji },
      },
      create: { commentId, userId, emoji },
      update: {},
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async removeReaction(commentId: string, userId: string, emoji: string) {
    const reaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: { commentId, userId, emoji },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.commentReaction.delete({
      where: {
        commentId_userId_emoji: { commentId, userId, emoji },
      },
    });
  }

  async getReactions(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const reactions = await this.prisma.commentReaction.findMany({
      where: { commentId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by emoji
    const grouped: Record<string, { emoji: string; count: number; users: { id: string; name: string; avatarUrl: string | null }[] }> = {};
    for (const reaction of reactions) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = { emoji: reaction.emoji, count: 0, users: [] };
      }
      grouped[reaction.emoji].count += 1;
      grouped[reaction.emoji].users.push(reaction.user);
    }

    return Object.values(grouped);
  }
}
