import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

export type TriggerType = 'cardMoved' | 'cardCreated' | 'labelAdded';

export type ActionType =
  | 'moveCard'
  | 'setLabel'
  | 'setAssignee'
  | 'setPriority'
  | 'addComment'
  | 'setDueDate'
  | 'archive'
  | 'sendNotification'
  | 'createChecklist';

export interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationAction {
  type: ActionType;
  params?: Record<string, unknown>;
}

export interface CardLike {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  priority?: string;
  labels?: Array<{ labelId: string }>;
  [key: string]: unknown;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, userId: string, dto: CreateAutomationDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return this.prisma.automationRule.create({
      data: {
        boardId,
        name: dto.name,
        trigger: dto.trigger as object,
        conditions: (dto.conditions ?? []) as object,
        actions: (dto.actions ?? []) as object,
        isEnabled: dto.isEnabled ?? true,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async findByBoardId(boardId: string) {
    return this.prisma.automationRule.findMany({
      where: { boardId },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return rule;
  }

  async update(id: string, dto: UpdateAutomationDto) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.trigger !== undefined && { trigger: dto.trigger as object }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions as object }),
        ...(dto.actions !== undefined && { actions: dto.actions as object }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async delete(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    await this.prisma.automationRule.delete({ where: { id } });
  }

  async toggle(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return this.prisma.automationRule.update({
      where: { id },
      data: { isEnabled: !rule.isEnabled },
    });
  }

  async execute(ruleId: string, card: CardLike): Promise<void> {
    const rule = await this.findById(ruleId);
    const actions = rule.actions as unknown as AutomationAction[];

    if (!Array.isArray(actions)) {
      return;
    }

    for (const action of actions) {
      try {
        await this.applyAction(action, card);
        await this.prisma.automationExecutionLog.create({
          data: {
            ruleId,
            cardId: card.id,
            status: 'success',
            details: {
              actionType: action.type,
              params: (action.params ?? {}) as Prisma.InputJsonValue,
            } as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to apply action "${action.type}" for rule "${rule.name}": ${(err as Error).message}`,
        );
        await this.prisma.automationExecutionLog.create({
          data: {
            ruleId,
            cardId: card.id,
            status: 'failure',
            details: {
              actionType: action.type,
              params: (action.params ?? {}) as Prisma.InputJsonValue,
              error: (err as Error).message,
            } as Prisma.InputJsonValue,
          },
        }).catch((logErr) => {
          this.logger.error(`Failed to write execution log: ${(logErr as Error).message}`);
        });
      }
    }
  }

  async getExecutionLogs(ruleId: string, options?: { limit?: number }) {
    return this.prisma.automationExecutionLog.findMany({
      where: { ruleId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  async triggerRules(
    boardId: string,
    triggerType: TriggerType,
    card: CardLike,
  ): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { boardId, isEnabled: true },
    });

    for (const rule of rules) {
      const trigger = rule.trigger as { type?: string };
      if (!trigger || trigger.type !== triggerType) {
        continue;
      }

      const conditions = rule.conditions as unknown as AutomationCondition[];
      if (!this.evaluateConditions(conditions, card)) {
        continue;
      }

      try {
        await this.execute(rule.id, card);
        this.logger.log(
          `Rule "${rule.name}" triggered for card "${card.id}" on board "${boardId}"`,
        );
      } catch (err) {
        this.logger.error(
          `Error executing rule "${rule.name}": ${(err as Error).message}`,
        );
      }
    }
  }

  private evaluateConditions(
    conditions: AutomationCondition[],
    card: CardLike,
  ): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) => {
      const { field, operator, value } = condition;
      const cardValue = card[field];

      switch (operator) {
        case 'equals':
          return cardValue === value;
        case 'notEquals':
          return cardValue !== value;
        case 'contains':
          return typeof cardValue === 'string' && cardValue.includes(value as string);
        case 'notContains':
          return typeof cardValue === 'string' && !cardValue.includes(value as string);
        default:
          return true;
      }
    });
  }

  private async applyAction(action: AutomationAction, card: CardLike): Promise<void> {
    const params = action.params ?? {};

    switch (action.type) {
      case 'moveCard': {
        const columnId = params['columnId'] as string | undefined;
        if (columnId) {
          await this.prisma.card.update({
            where: { id: card.id },
            data: { columnId },
          });
        }
        break;
      }

      case 'setLabel': {
        const labelId = params['labelId'] as string | undefined;
        if (labelId) {
          const existing = await this.prisma.cardLabel.findUnique({
            where: { cardId_labelId: { cardId: card.id, labelId } },
          });
          if (!existing) {
            await this.prisma.cardLabel.create({
              data: { cardId: card.id, labelId },
            });
          }
        }
        break;
      }

      case 'setAssignee': {
        const userId = params['userId'] as string | undefined;
        if (userId) {
          const existing = await this.prisma.cardAssignee.findUnique({
            where: { cardId_userId: { cardId: card.id, userId } },
          });
          if (!existing) {
            await this.prisma.cardAssignee.create({
              data: { cardId: card.id, userId },
            });
          }
        }
        break;
      }

      case 'setPriority': {
        const priority = params['priority'] as Priority | undefined;
        if (priority) {
          await this.prisma.card.update({
            where: { id: card.id },
            data: { priority },
          });
        }
        break;
      }

      case 'addComment': {
        const content = params['content'] as string | undefined;
        const authorId = params['authorId'] as string | undefined;
        if (content && authorId) {
          await this.prisma.comment.create({
            data: { cardId: card.id, authorId, content },
          });
        }
        break;
      }

      case 'setDueDate': {
        const dueDate = params['dueDate'] as string | undefined;
        if (dueDate) {
          await this.prisma.card.update({
            where: { id: card.id },
            data: { dueDate: new Date(dueDate) },
          });
        }
        break;
      }

      case 'archive': {
        await this.prisma.card.update({
          where: { id: card.id },
          data: { archivedAt: new Date() },
        });
        break;
      }

      case 'sendNotification': {
        const title = params['title'] as string | undefined;
        const message = params['message'] as string | undefined;
        const link = params['link'] as string | undefined;

        if (title && message) {
          const assignees = await this.prisma.cardAssignee.findMany({
            where: { cardId: card.id },
            select: { userId: true },
          });
          for (const assignee of assignees) {
            await this.prisma.notification.create({
              data: {
                userId: assignee.userId,
                type: 'CARD_MOVED',
                title,
                message,
                link: link ?? `/boards/${card.boardId}`,
              },
            });
          }
        }
        break;
      }

      case 'createChecklist': {
        const checklistTitle = params['title'] as string | undefined;
        if (checklistTitle) {
          const lastChecklist = await this.prisma.checklist.findFirst({
            where: { cardId: card.id },
            orderBy: { position: 'desc' },
            select: { position: true },
          });
          const position = lastChecklist ? lastChecklist.position + 1024 : 1024;

          await this.prisma.checklist.create({
            data: {
              cardId: card.id,
              title: checklistTitle,
              position,
            },
          });
        }
        break;
      }

      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
        break;
    }
  }
}
