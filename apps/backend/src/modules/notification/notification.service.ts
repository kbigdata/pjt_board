import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId_type: { userId: params.userId, type: params.type } },
    });

    if (setting && !setting.enabled) {
      this.logger.debug(
        `Notification type ${params.type} is disabled for user ${params.userId}; skipping`,
      );
      return null;
    }

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
    if (params.userIds.length === 0) {
      return this.prisma.notification.createMany({ data: [] });
    }

    const disabledSettings = await this.prisma.notificationSetting.findMany({
      where: {
        userId: { in: params.userIds },
        type: params.type,
        enabled: false,
      },
      select: { userId: true },
    });

    const disabledUserIds = new Set(disabledSettings.map((s) => s.userId));
    const enabledUserIds = params.userIds.filter((id) => !disabledUserIds.has(id));

    return this.prisma.notification.createMany({
      data: enabledUserIds.map((userId) => ({
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

  async getSettings(userId: string) {
    const existing = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });

    const existingTypes = new Set(existing.map((s) => s.type));
    const missingTypes = ALL_NOTIFICATION_TYPES.filter((t) => !existingTypes.has(t));

    if (missingTypes.length > 0) {
      await this.prisma.notificationSetting.createMany({
        data: missingTypes.map((type) => ({ userId, type, enabled: true })),
        skipDuplicates: true,
      });

      return this.prisma.notificationSetting.findMany({
        where: { userId },
        orderBy: { type: 'asc' },
      });
    }

    return existing.sort((a, b) => a.type.localeCompare(b.type));
  }

  async updateSetting(userId: string, type: NotificationType, enabled: boolean) {
    return this.prisma.notificationSetting.upsert({
      where: { userId_type: { userId, type } },
      update: { enabled },
      create: { userId, type, enabled },
    });
  }

  async createDueDateReminders(): Promise<number> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const cards = await this.prisma.card.findMany({
      where: {
        dueDate: { gte: now, lte: in24Hours },
        archivedAt: null,
      },
      include: {
        assignees: {
          select: { userId: true },
        },
      },
    });

    let notificationCount = 0;

    for (const card of cards) {
      const userIds = card.assignees.map((a) => a.userId);
      if (userIds.length === 0) continue;

      const result = await this.createForMany({
        userIds,
        type: NotificationType.CARD_DUE_SOON,
        title: 'Card due soon',
        message: `"${card.title}" is due within 24 hours`,
        link: `/boards/${card.boardId}`,
      });

      notificationCount += result.count;
    }

    this.logger.log(`Created ${notificationCount} due date reminder notification(s)`);
    return notificationCount;
  }
}
