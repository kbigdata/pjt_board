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
}
