import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  }

  async createForMany(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      })),
    });
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; cursor?: string; unreadOnly?: boolean },
  ) {
    const limit = options?.limit ?? 20;
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(options?.cursor
        ? { skip: 1, cursor: { id: options.cursor } }
        : {}),
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
