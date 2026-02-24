import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  card: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
  },
  recurringCardConfig: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  cardLabel: {
    createMany: jest.fn(),
  },
  checklist: {
    create: jest.fn(),
  },
  checklistItem: {
    createMany: jest.fn(),
  },
};

describe('RecurringService', () => {
  let service: RecurringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecurringService>(RecurringService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException when card does not exist', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);
      await expect(
        service.create('no-card', { cronExpression: '0 9 * * 1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a recurring config with computed nextRunAt when not provided', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({ id: 'card-1' });
      const mockConfig = {
        id: 'config-1',
        cardId: 'card-1',
        cronExpression: '0 9 * * *',
        enabled: true,
      };
      mockPrisma.recurringCardConfig.create.mockResolvedValue(mockConfig);

      const result = await service.create('card-1', { cronExpression: '0 9 * * *' });

      expect(mockPrisma.recurringCardConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cardId: 'card-1',
            cronExpression: '0 9 * * *',
            enabled: true,
          }),
        }),
      );
      expect(result).toEqual(mockConfig);
    });

    it('should use provided nextRunAt when supplied', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({ id: 'card-1' });
      mockPrisma.recurringCardConfig.create.mockResolvedValue({});

      const nextRunAt = '2026-03-01T09:00:00.000Z';
      await service.create('card-1', { cronExpression: '0 9 * * 1', nextRunAt });

      const call = mockPrisma.recurringCardConfig.create.mock.calls[0][0];
      expect(call.data.nextRunAt).toEqual(new Date(nextRunAt));
    });

    it('should create config with enabled=false when specified', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({ id: 'card-1' });
      mockPrisma.recurringCardConfig.create.mockResolvedValue({});

      await service.create('card-1', { cronExpression: '0 9 * * *', enabled: false });

      const call = mockPrisma.recurringCardConfig.create.mock.calls[0][0];
      expect(call.data.enabled).toBe(false);
    });
  });

  describe('findByCardId', () => {
    it('should return the recurring config for a card', async () => {
      const mockConfig = { id: 'config-1', cardId: 'card-1' };
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.findByCardId('card-1');

      expect(mockPrisma.recurringCardConfig.findUnique).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null when no config exists', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(null);
      const result = await service.findByCardId('card-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when config does not exist', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(null);
      await expect(
        service.update('card-1', { cronExpression: '0 9 * * 1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update the config', async () => {
      const existing = { id: 'config-1', cardId: 'card-1', cronExpression: '0 9 * * *' };
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(existing);
      mockPrisma.recurringCardConfig.update.mockResolvedValue({
        ...existing,
        cronExpression: '0 9 * * 1',
      });

      const result = await service.update('card-1', { cronExpression: '0 9 * * 1' });

      expect(mockPrisma.recurringCardConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cardId: 'card-1' },
          data: expect.objectContaining({ cronExpression: '0 9 * * 1' }),
        }),
      );
      expect(result.cronExpression).toBe('0 9 * * 1');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when config does not exist', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(null);
      await expect(service.delete('card-1')).rejects.toThrow(NotFoundException);
    });

    it('should delete the config', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue({ id: 'config-1' });
      mockPrisma.recurringCardConfig.delete.mockResolvedValue({});

      await service.delete('card-1');

      expect(mockPrisma.recurringCardConfig.delete).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
      });
    });
  });

  describe('toggle', () => {
    it('should throw NotFoundException when config does not exist', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue(null);
      await expect(service.toggle('card-1')).rejects.toThrow(NotFoundException);
    });

    it('should toggle enabled from true to false', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        enabled: true,
      });
      mockPrisma.recurringCardConfig.update.mockResolvedValue({ enabled: false });

      const result = await service.toggle('card-1');

      expect(mockPrisma.recurringCardConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cardId: 'card-1' },
          data: { enabled: false },
        }),
      );
      expect(result.enabled).toBe(false);
    });

    it('should toggle enabled from false to true', async () => {
      mockPrisma.recurringCardConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        enabled: false,
      });
      mockPrisma.recurringCardConfig.update.mockResolvedValue({ enabled: true });

      const result = await service.toggle('card-1');

      expect(mockPrisma.recurringCardConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { enabled: true } }),
      );
      expect(result.enabled).toBe(true);
    });
  });

  describe('processRecurringCards', () => {
    it('should return 0 when no configs are due', async () => {
      mockPrisma.recurringCardConfig.findMany.mockResolvedValue([]);
      const count = await service.processRecurringCards();
      expect(count).toBe(0);
    });

    it('should skip archived cards', async () => {
      mockPrisma.recurringCardConfig.findMany.mockResolvedValue([
        {
          id: 'config-1',
          cronExpression: '0 9 * * *',
          nextRunAt: new Date('2026-01-01'),
          card: {
            id: 'card-1',
            archivedAt: new Date(),
            boardId: 'board-1',
            columnId: 'col-1',
            labels: [],
            checklists: [],
          },
        },
      ]);

      const count = await service.processRecurringCards();
      expect(count).toBe(0);
      expect(mockPrisma.card.create).not.toHaveBeenCalled();
    });

    it('should duplicate a card and advance nextRunAt', async () => {
      const now = new Date();
      mockPrisma.recurringCardConfig.findMany.mockResolvedValue([
        {
          id: 'config-1',
          cronExpression: '0 9 * * *',
          nextRunAt: new Date(now.getTime() - 1000),
          card: {
            id: 'card-1',
            archivedAt: null,
            boardId: 'board-1',
            columnId: 'col-1',
            swimlaneId: null,
            title: 'Daily Standup',
            description: 'Stand up meeting',
            priority: 'MEDIUM',
            estimatedHours: null,
            createdById: 'user-1',
            startDate: null,
            dueDate: null,
            labels: [],
            checklists: [],
          },
        },
      ]);
      mockPrisma.card.aggregate.mockResolvedValue({ _max: { cardNumber: 10 } });
      mockPrisma.card.findFirst.mockResolvedValue({ position: 2048 });
      mockPrisma.card.create.mockResolvedValue({ id: 'card-2' });
      mockPrisma.recurringCardConfig.update.mockResolvedValue({});

      const count = await service.processRecurringCards();

      expect(count).toBe(1);
      expect(mockPrisma.card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Daily Standup',
            boardId: 'board-1',
            columnId: 'col-1',
            cardNumber: 11,
          }),
        }),
      );
      expect(mockPrisma.recurringCardConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-1' },
          data: expect.objectContaining({ nextRunAt: expect.any(Date) }),
        }),
      );
    });

    it('should copy labels and checklists when duplicating', async () => {
      const now = new Date();
      mockPrisma.recurringCardConfig.findMany.mockResolvedValue([
        {
          id: 'config-1',
          cronExpression: '0 9 * * *',
          nextRunAt: new Date(now.getTime() - 1000),
          card: {
            id: 'card-1',
            archivedAt: null,
            boardId: 'board-1',
            columnId: 'col-1',
            swimlaneId: null,
            title: 'Task',
            description: null,
            priority: 'HIGH',
            estimatedHours: null,
            createdById: 'user-1',
            startDate: null,
            dueDate: null,
            labels: [{ labelId: 'label-1' }],
            checklists: [
              {
                id: 'cl-1',
                title: 'Checklist',
                position: 1024,
                items: [{ title: 'Item 1', isChecked: true, position: 1024 }],
              },
            ],
          },
        },
      ]);
      mockPrisma.card.aggregate.mockResolvedValue({ _max: { cardNumber: 5 } });
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({ id: 'new-card' });
      mockPrisma.cardLabel.createMany.mockResolvedValue({});
      mockPrisma.checklist.create.mockResolvedValue({ id: 'new-cl' });
      mockPrisma.checklistItem.createMany.mockResolvedValue({});
      mockPrisma.recurringCardConfig.update.mockResolvedValue({});

      const count = await service.processRecurringCards();

      expect(count).toBe(1);
      expect(mockPrisma.cardLabel.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ cardId: 'new-card', labelId: 'label-1' }],
        }),
      );
      expect(mockPrisma.checklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cardId: 'new-card', title: 'Checklist' }),
        }),
      );
      expect(mockPrisma.checklistItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ title: 'Item 1', isChecked: false })],
        }),
      );
    });
  });
});
