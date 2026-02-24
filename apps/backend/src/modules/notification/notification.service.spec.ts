import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: Record<string, any>;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.CARD_ASSIGNED,
    title: 'You were assigned to a card',
    message: 'You were assigned to "Test Card"',
    link: '/boards/board-1',
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('should create a notification for a single user', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.CARD_ASSIGNED,
        title: 'You were assigned to a card',
        message: 'You were assigned to "Test Card"',
        link: '/boards/board-1',
      });

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.CARD_ASSIGNED,
          title: 'You were assigned to a card',
          message: 'You were assigned to "Test Card"',
          link: '/boards/board-1',
        },
      });
    });

    it('should create a notification without a link', async () => {
      const notifWithoutLink = { ...mockNotification, link: undefined };
      prisma.notification.create.mockResolvedValue(notifWithoutLink);

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.CARD_COMMENTED,
        title: 'New comment',
        message: 'Someone commented on your card',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.CARD_COMMENTED,
          title: 'New comment',
          message: 'Someone commented on your card',
          link: undefined,
        },
      });
      expect(result).toEqual(notifWithoutLink);
    });
  });

  describe('createForMany', () => {
    it('should create notifications for multiple users', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.createForMany({
        userIds: ['user-1', 'user-2', 'user-3'],
        type: NotificationType.CARD_MOVED,
        title: 'Card moved',
        message: 'A card was moved',
        link: '/boards/board-1',
      });

      expect(result).toEqual({ count: 3 });
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-1',
            type: NotificationType.CARD_MOVED,
            title: 'Card moved',
            message: 'A card was moved',
            link: '/boards/board-1',
          },
          {
            userId: 'user-2',
            type: NotificationType.CARD_MOVED,
            title: 'Card moved',
            message: 'A card was moved',
            link: '/boards/board-1',
          },
          {
            userId: 'user-3',
            type: NotificationType.CARD_MOVED,
            title: 'Card moved',
            message: 'A card was moved',
            link: '/boards/board-1',
          },
        ],
      });
    });

    it('should handle an empty userIds array', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 0 });

      const result = await service.createForMany({
        userIds: [],
        type: NotificationType.CARD_ASSIGNED,
        title: 'Title',
        message: 'Message',
      });

      expect(result).toEqual({ count: 0 });
      expect(prisma.notification.createMany).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe('findByUserId', () => {
    it('should return notifications for a user with default limit', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.findByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should apply limit option', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findByUserId('user-1', { limit: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findByUserId('user-1', { unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });

    it('should apply cursor-based pagination', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findByUserId('user-1', { cursor: 'notif-5' });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'notif-5' },
        }),
      );
    });

    it('should not apply cursor when not provided', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findByUserId('user-1');

      const call = prisma.notification.findMany.mock.calls[0][0];
      expect(call.skip).toBeUndefined();
      expect(call.cursor).toBeUndefined();
    });
  });

  describe('countUnread', () => {
    it('should return the count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.countUnread('user-1');

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should return 0 when there are no unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.countUnread('user-1');

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result).toEqual({ count: 1 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('should return count 0 when notification does not belong to user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead('notif-1', 'other-user');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 7 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 7 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });

    it('should return count 0 when there are no unread notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });
});
