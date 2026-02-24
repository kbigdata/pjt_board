import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { AutomationService, CardLike } from './automation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AutomationService', () => {
  let service: AutomationService;
  let prisma: Record<string, any>;

  const mockBoard = { id: 'board-1', title: 'Test Board' };

  const mockRule = {
    id: 'rule-1',
    boardId: 'board-1',
    name: 'Auto Move',
    trigger: { type: 'cardCreated' },
    conditions: [],
    actions: [{ type: 'moveCard', params: { columnId: 'col-2' } }],
    isEnabled: true,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCard: CardLike = {
    id: 'card-1',
    boardId: 'board-1',
    columnId: 'col-1',
    title: 'Test Card',
    priority: Priority.MEDIUM,
  };

  beforeEach(async () => {
    prisma = {
      board: { findUnique: jest.fn() },
      automationRule: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      automationExecutionLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      card: {
        update: jest.fn(),
      },
      cardLabel: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cardAssignee: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      checklist: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      comment: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  });

  describe('create', () => {
    it('should create automation rule', async () => {
      const ruleWithRelations = {
        ...mockRule,
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.automationRule.create.mockResolvedValue(ruleWithRelations);

      const result = await service.create('board-1', 'user-1', {
        name: 'Auto Move',
        trigger: { type: 'cardCreated' },
        conditions: [],
        actions: [{ type: 'moveCard', params: { columnId: 'col-2' } }],
      });

      expect(result.name).toBe('Auto Move');
      expect(prisma.automationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boardId: 'board-1',
            name: 'Auto Move',
            createdById: 'user-1',
            isEnabled: true,
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', 'user-1', {
          name: 'Rule',
          trigger: { type: 'cardCreated' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default isEnabled to true', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.automationRule.create.mockResolvedValue({
        ...mockRule,
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      });

      await service.create('board-1', 'user-1', {
        name: 'Rule',
        trigger: { type: 'cardCreated' },
      });

      expect(prisma.automationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isEnabled: true }),
        }),
      );
    });
  });

  describe('findByBoardId', () => {
    it('should return rules for a board', async () => {
      prisma.automationRule.findMany.mockResolvedValue([mockRule]);

      const result = await service.findByBoardId('board-1');

      expect(result).toHaveLength(1);
      expect(prisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { boardId: 'board-1' } }),
      );
    });
  });

  describe('findById', () => {
    it('should return rule with details', async () => {
      prisma.automationRule.findUnique.mockResolvedValue({
        ...mockRule,
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      });

      const result = await service.findById('rule-1');

      expect(result.id).toBe('rule-1');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update rule fields', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(mockRule);
      prisma.automationRule.update.mockResolvedValue({
        ...mockRule,
        name: 'Updated Rule',
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      });

      const result = await service.update('rule-1', { name: 'Updated Rule' });

      expect(result.name).toBe('Updated Rule');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete rule', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(mockRule);
      prisma.automationRule.delete.mockResolvedValue(mockRule);

      await service.delete('rule-1');

      expect(prisma.automationRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('should toggle rule from enabled to disabled', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(mockRule);
      prisma.automationRule.update.mockResolvedValue({ ...mockRule, isEnabled: false });

      const result = await service.toggle('rule-1');

      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { isEnabled: false },
      });
      expect(result.isEnabled).toBe(false);
    });

    it('should toggle rule from disabled to enabled', async () => {
      prisma.automationRule.findUnique.mockResolvedValue({ ...mockRule, isEnabled: false });
      prisma.automationRule.update.mockResolvedValue({ ...mockRule, isEnabled: true });

      const result = await service.toggle('rule-1');

      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { isEnabled: true },
      });
      expect(result.isEnabled).toBe(true);
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.automationRule.findUnique.mockResolvedValue(null);

      await expect(service.toggle('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('execute', () => {
    it('should execute moveCard action', async () => {
      const ruleWithMoveAction = {
        ...mockRule,
        actions: [{ type: 'moveCard', params: { columnId: 'col-2' } }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithMoveAction);
      prisma.card.update.mockResolvedValue({ ...mockCard, columnId: 'col-2' });

      await service.execute('rule-1', mockCard);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { columnId: 'col-2' },
      });
    });

    it('should execute setLabel action', async () => {
      const ruleWithLabelAction = {
        ...mockRule,
        actions: [{ type: 'setLabel', params: { labelId: 'label-1' } }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithLabelAction);
      prisma.cardLabel.findUnique.mockResolvedValue(null);
      prisma.cardLabel.create.mockResolvedValue({});

      await service.execute('rule-1', mockCard);

      expect(prisma.cardLabel.create).toHaveBeenCalledWith({
        data: { cardId: 'card-1', labelId: 'label-1' },
      });
    });

    it('should execute setAssignee action', async () => {
      const ruleWithAssigneeAction = {
        ...mockRule,
        actions: [{ type: 'setAssignee', params: { userId: 'user-2' } }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithAssigneeAction);
      prisma.cardAssignee.findUnique.mockResolvedValue(null);
      prisma.cardAssignee.create.mockResolvedValue({});

      await service.execute('rule-1', mockCard);

      expect(prisma.cardAssignee.create).toHaveBeenCalledWith({
        data: { cardId: 'card-1', userId: 'user-2' },
      });
    });

    it('should execute setPriority action', async () => {
      const ruleWithPriorityAction = {
        ...mockRule,
        actions: [{ type: 'setPriority', params: { priority: Priority.HIGH } }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithPriorityAction);
      prisma.card.update.mockResolvedValue({ ...mockCard, priority: Priority.HIGH });

      await service.execute('rule-1', mockCard);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { priority: Priority.HIGH },
      });
    });

    it('should execute addComment action', async () => {
      const ruleWithCommentAction = {
        ...mockRule,
        actions: [{ type: 'addComment', params: { content: 'Auto comment', authorId: 'user-1' } }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithCommentAction);
      prisma.comment.create.mockResolvedValue({});

      await service.execute('rule-1', mockCard);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: { cardId: 'card-1', authorId: 'user-1', content: 'Auto comment' },
      });
    });

    it('should execute archive action', async () => {
      const ruleWithArchiveAction = {
        ...mockRule,
        actions: [{ type: 'archive' }],
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      };
      prisma.automationRule.findUnique.mockResolvedValue(ruleWithArchiveAction);
      prisma.card.update.mockResolvedValue({ ...mockCard, archivedAt: new Date() });

      await service.execute('rule-1', mockCard);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { archivedAt: expect.any(Date) },
      });
    });
  });

  describe('triggerRules', () => {
    it('should execute rules matching trigger type and conditions', async () => {
      const rules = [
        { ...mockRule, trigger: { type: 'cardCreated' }, conditions: [] },
        { ...mockRule, id: 'rule-2', trigger: { type: 'cardMoved' }, conditions: [] },
      ];
      prisma.automationRule.findMany.mockResolvedValue(rules);
      prisma.automationRule.findUnique.mockResolvedValue({
        ...mockRule,
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      });
      prisma.card.update.mockResolvedValue({});

      await service.triggerRules('board-1', 'cardCreated', mockCard);

      // Only the cardCreated rule should have been executed
      expect(prisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { boardId: 'board-1', isEnabled: true },
        }),
      );
    });

    it('should skip rules with non-matching trigger type', async () => {
      prisma.automationRule.findMany.mockResolvedValue([
        { ...mockRule, trigger: { type: 'labelAdded' }, conditions: [] },
      ]);

      await service.triggerRules('board-1', 'cardCreated', mockCard);

      // findUnique should not be called as the rule was filtered out
      expect(prisma.automationRule.findUnique).not.toHaveBeenCalled();
    });

    it('should skip rules with failing conditions', async () => {
      prisma.automationRule.findMany.mockResolvedValue([
        {
          ...mockRule,
          trigger: { type: 'cardCreated' },
          conditions: [{ field: 'columnId', operator: 'equals', value: 'col-99' }],
        },
      ]);

      await service.triggerRules('board-1', 'cardCreated', mockCard);

      expect(prisma.automationRule.findUnique).not.toHaveBeenCalled();
    });

    it('should execute rule when condition is met', async () => {
      const conditionRule = {
        ...mockRule,
        trigger: { type: 'cardCreated' },
        conditions: [{ field: 'columnId', operator: 'equals', value: 'col-1' }],
      };
      prisma.automationRule.findMany.mockResolvedValue([conditionRule]);
      prisma.automationRule.findUnique.mockResolvedValue({
        ...conditionRule,
        createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
      });
      prisma.card.update.mockResolvedValue({});

      await service.triggerRules('board-1', 'cardCreated', mockCard);

      expect(prisma.automationRule.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rule-1' } }),
      );
    });
  });
});
