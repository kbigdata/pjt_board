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

  const mockSetting = {
    id: 'setting-1',
    userId: 'user-1',
    type: NotificationType.CARD_ASSIGNED,
    enabled: true,
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
      notificationSetting: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      card: {
        findMany: jest.fn(),
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
    it('should create a notification for a single user when setting is enabled', async () => {
      prisma.notificationSetting.findUnique.mockResolvedValue({ ...mockSetting, enabled: true });
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

    it('should skip notification creation when setting is disabled', async () => {
      prisma.notificationSetting.findUnique.mockResolvedValue({ ...mockSetting, enabled: false });

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.CARD_ASSIGNED,
        title: 'You were assigned to a card',
        message: 'You were assigned to "Test Card"',
      });

      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create a notification when no setting record exists (default enabled)', async () => {
      prisma.notificationSetting.findUnique.mockResolvedValue(null);
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
    it('should create notifications for multiple users when all enabled', async () => {
      prisma.notificationSetting.findMany.mockResolvedValue([]);
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

    it('should exclude users with the notification type disabled', async () => {
      prisma.notificationSetting.findMany.mockResolvedValue([
        { userId: 'user-2', type: NotificationType.CARD_MOVED },
      ]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      await service.createForMany({
        userIds: ['user-1', 'user-2', 'user-3'],
        type: NotificationType.CARD_MOVED,
        title: 'Card moved',
        message: 'A card was moved',
      });

      const callData = prisma.notification.createMany.mock.calls[0][0].data;
      expect(callData).toHaveLength(2);
      expect(callData.map((d: { userId: string }) => d.userId)).not.toContain('user-2');
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

  describe('getSettings', () => {
    it('should return existing settings when all types are present', async () => {
      const allTypes = Object.values(NotificationType);
      const existingSettings = allTypes.map((type) => ({
        id: `setting-${type}`,
        userId: 'user-1',
        type,
        enabled: true,
      }));
      prisma.notificationSetting.findMany.mockResolvedValue(existingSettings);

      const result = await service.getSettings('user-1');

      expect(result).toHaveLength(allTypes.length);
      expect(prisma.notificationSetting.createMany).not.toHaveBeenCalled();
    });

    it('should create default settings for missing types', async () => {
      prisma.notificationSetting.findMany
        .mockResolvedValueOnce([mockSetting])
        .mockResolvedValueOnce([
          mockSetting,
          { id: 'setting-2', userId: 'user-1', type: NotificationType.CARD_COMMENTED, enabled: true },
          { id: 'setting-3', userId: 'user-1', type: NotificationType.CARD_DUE_SOON, enabled: true },
          { id: 'setting-4', userId: 'user-1', type: NotificationType.CARD_MOVED, enabled: true },
          { id: 'setting-5', userId: 'user-1', type: NotificationType.MEMBER_ADDED, enabled: true },
        ]);
      prisma.notificationSetting.createMany.mockResolvedValue({ count: 4 });

      const result = await service.getSettings('user-1');

      expect(prisma.notificationSetting.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
      expect(result).toHaveLength(5);
    });

    it('should return empty defaults when user has no settings at all', async () => {
      const allTypes = Object.values(NotificationType);
      const defaultSettings = allTypes.map((type) => ({
        id: `setting-${type}`,
        userId: 'user-1',
        type,
        enabled: true,
      }));

      prisma.notificationSetting.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(defaultSettings);
      prisma.notificationSetting.createMany.mockResolvedValue({ count: allTypes.length });

      const result = await service.getSettings('user-1');

      expect(prisma.notificationSetting.createMany).toHaveBeenCalled();
      expect(result).toHaveLength(allTypes.length);
    });
  });

  describe('updateSetting', () => {
    it('should upsert a notification setting to disabled', async () => {
      const updatedSetting = { ...mockSetting, enabled: false };
      prisma.notificationSetting.upsert.mockResolvedValue(updatedSetting);

      const result = await service.updateSetting('user-1', NotificationType.CARD_ASSIGNED, false);

      expect(result).toEqual(updatedSetting);
      expect(prisma.notificationSetting.upsert).toHaveBeenCalledWith({
        where: { userId_type: { userId: 'user-1', type: NotificationType.CARD_ASSIGNED } },
        update: { enabled: false },
        create: { userId: 'user-1', type: NotificationType.CARD_ASSIGNED, enabled: false },
      });
    });

    it('should upsert a notification setting to enabled', async () => {
      prisma.notificationSetting.upsert.mockResolvedValue(mockSetting);

      const result = await service.updateSetting('user-1', NotificationType.CARD_ASSIGNED, true);

      expect(result).toEqual(mockSetting);
      expect(prisma.notificationSetting.upsert).toHaveBeenCalledWith({
        where: { userId_type: { userId: 'user-1', type: NotificationType.CARD_ASSIGNED } },
        update: { enabled: true },
        create: { userId: 'user-1', type: NotificationType.CARD_ASSIGNED, enabled: true },
      });
    });
  });

  describe('createDueDateReminders', () => {
    it('should create notifications for assignees of cards due within 24 hours', async () => {
      const dueCard = {
        id: 'card-1',
        title: 'Fix bug',
        boardId: 'board-1',
        dueDate: new Date(Date.now() + 60 * 60 * 1000),
        assignees: [{ userId: 'user-1' }, { userId: 'user-2' }],
      };
      prisma.card.findMany.mockResolvedValue([dueCard]);
      prisma.notificationSetting.findMany.mockResolvedValue([]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const count = await service.createDueDateReminders();

      expect(count).toBe(2);
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-1',
              type: NotificationType.CARD_DUE_SOON,
            }),
            expect.objectContaining({
              userId: 'user-2',
              type: NotificationType.CARD_DUE_SOON,
            }),
          ]),
        }),
      );
    });

    it('should return 0 when no cards are due within 24 hours', async () => {
      prisma.card.findMany.mockResolvedValue([]);

      const count = await service.createDueDateReminders();

      expect(count).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should skip cards with no assignees', async () => {
      const cardWithNoAssignees = {
        id: 'card-2',
        title: 'Unassigned task',
        boardId: 'board-1',
        dueDate: new Date(Date.now() + 60 * 60 * 1000),
        assignees: [],
      };
      prisma.card.findMany.mockResolvedValue([cardWithNoAssignees]);

      const count = await service.createDueDateReminders();

      expect(count).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
