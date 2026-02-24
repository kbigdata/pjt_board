import { Injectable, Logger } from '@nestjs/common';
import { ActivityAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    boardId: string;
    userId: string;
    action: ActivityAction;
    cardId?: string;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.activity.create({
      data: {
        boardId: params.boardId,
        userId: params.userId,
        action: params.action,
        cardId: params.cardId,
        details: (params.details as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async findByBoardId(boardId: string, options?: { limit?: number; cursor?: string }) {
    const limit = options?.limit ?? 50;

    return this.prisma.activity.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        card: { select: { id: true, title: true, cardNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(options?.cursor && {
        skip: 1,
        cursor: { id: options.cursor },
      }),
    });
  }
}
