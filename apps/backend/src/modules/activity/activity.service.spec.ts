import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityAction } from '@prisma/client';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: jest.Mocked<PrismaService>;

  const mockActivity = {
    id: 'activity-1',
    boardId: 'board-1',
    cardId: 'card-1',
    userId: 'user-1',
    action: ActivityAction.CREATED,
    details: { title: 'Test card' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: PrismaService,
          useValue: {
            activity: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an activity record', async () => {
      (prisma.activity.create as jest.Mock).mockResolvedValue(mockActivity);

      const result = await service.log({
        boardId: 'board-1',
        userId: 'user-1',
        action: ActivityAction.CREATED,
        cardId: 'card-1',
        details: { title: 'Test card' },
      });

      expect(result).toEqual(mockActivity);
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          userId: 'user-1',
          action: ActivityAction.CREATED,
          cardId: 'card-1',
          details: { title: 'Test card' },
        },
      });
    });

    it('should create activity without cardId', async () => {
      const activity = { ...mockActivity, cardId: null };
      (prisma.activity.create as jest.Mock).mockResolvedValue(activity);

      await service.log({
        boardId: 'board-1',
        userId: 'user-1',
        action: ActivityAction.CREATED,
      });

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          userId: 'user-1',
          action: ActivityAction.CREATED,
          cardId: undefined,
          details: undefined,
        },
      });
    });
  });

  describe('findByBoardId', () => {
    it('should return activities ordered by createdAt desc', async () => {
      const activities = [mockActivity];
      (prisma.activity.findMany as jest.Mock).mockResolvedValue(activities);

      const result = await service.findByBoardId('board-1');

      expect(result).toEqual(activities);
      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          card: { select: { id: true, title: true, cardNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should support custom limit', async () => {
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByBoardId('board-1', { limit: 10 });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should support cursor-based pagination', async () => {
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByBoardId('board-1', { cursor: 'activity-x' });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'activity-x' },
        }),
      );
    });
  });
});
