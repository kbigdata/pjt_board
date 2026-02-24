import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringConfigDto } from './dto/create-recurring-config.dto';
import { UpdateRecurringConfigDto } from './dto/update-recurring-config.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute the next run date from a cron expression.
   * Supports a subset of common patterns:
   *  - daily   : any "0 H * * *"  → tomorrow at H:00
   *  - weekly  : any "0 H * * D"  → next weekday D at H:00
   *  - monthly : any "0 H 1 * *"  → 1st of next month at H:00
   *  - custom  : returns 24 hours from now as a safe default
   */
  private computeNextRunAt(cronExpression: string): Date {
    const now = new Date();
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length !== 5) {
      // safe default: 24h from now
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(isNaN(m) ? 0 : m);
    next.setHours(isNaN(h) ? 9 : h);

    // Monthly: "0 H 1 * *"
    if (dayOfMonth !== '*' && dayOfWeek === '*') {
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      return next;
    }

    // Weekly: "0 H * * D" (D = 0-6, 0=Sunday)
    if (dayOfWeek !== '*' && dayOfMonth === '*') {
      const targetDay = parseInt(dayOfWeek, 10);
      if (!isNaN(targetDay)) {
        const diff = (targetDay - now.getDay() + 7) % 7 || 7;
        next.setDate(now.getDate() + diff);
        return next;
      }
    }

    // Daily: "0 H * * *"
    next.setDate(now.getDate() + 1);
    return next;
  }

  async create(cardId: string, dto: CreateRecurringConfigDto) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const nextRunAt = dto.nextRunAt
      ? new Date(dto.nextRunAt)
      : this.computeNextRunAt(dto.cronExpression);

    return this.prisma.recurringCardConfig.create({
      data: {
        cardId,
        cronExpression: dto.cronExpression,
        nextRunAt,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async findByCardId(cardId: string) {
    return this.prisma.recurringCardConfig.findUnique({
      where: { cardId },
    });
  }

  async update(cardId: string, dto: UpdateRecurringConfigDto) {
    const config = await this.prisma.recurringCardConfig.findUnique({
      where: { cardId },
    });
    if (!config) {
      throw new NotFoundException('Recurring config not found for this card');
    }

    const nextRunAt =
      dto.nextRunAt
        ? new Date(dto.nextRunAt)
        : dto.cronExpression
          ? this.computeNextRunAt(dto.cronExpression)
          : undefined;

    return this.prisma.recurringCardConfig.update({
      where: { cardId },
      data: {
        ...(dto.cronExpression !== undefined && { cronExpression: dto.cronExpression }),
        ...(nextRunAt !== undefined && { nextRunAt }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
  }

  async delete(cardId: string) {
    const config = await this.prisma.recurringCardConfig.findUnique({
      where: { cardId },
    });
    if (!config) {
      throw new NotFoundException('Recurring config not found for this card');
    }

    await this.prisma.recurringCardConfig.delete({ where: { cardId } });
  }

  async toggle(cardId: string) {
    const config = await this.prisma.recurringCardConfig.findUnique({
      where: { cardId },
    });
    if (!config) {
      throw new NotFoundException('Recurring config not found for this card');
    }

    return this.prisma.recurringCardConfig.update({
      where: { cardId },
      data: { enabled: !config.enabled },
    });
  }

  async processRecurringCards(): Promise<number> {
    const now = new Date();

    const dueConfigs = await this.prisma.recurringCardConfig.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      include: {
        card: {
          include: {
            labels: { select: { labelId: true } },
            checklists: {
              include: { items: { orderBy: { position: 'asc' } } },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    let created = 0;

    for (const config of dueConfigs) {
      const original = config.card;
      if (!original || original.archivedAt) {
        continue;
      }

      try {
        // Compute new dueDate from offset if original had both startDate and dueDate
        let newDueDate: Date | undefined;
        if (original.startDate && original.dueDate) {
          const offset = original.dueDate.getTime() - original.startDate.getTime();
          newDueDate = new Date(config.nextRunAt.getTime() + offset);
        }

        // Get next card number for the board
        const maxCardNumber = await this.prisma.card.aggregate({
          where: { boardId: original.boardId },
          _max: { cardNumber: true },
        });
        const cardNumber = (maxCardNumber._max.cardNumber ?? 0) + 1;

        // Get last position in the column
        const lastCard = await this.prisma.card.findFirst({
          where: { columnId: original.columnId, archivedAt: null },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = lastCard ? lastCard.position + 1024 : 1024;

        // Duplicate the card
        const newCard = await this.prisma.card.create({
          data: {
            boardId: original.boardId,
            columnId: original.columnId,
            swimlaneId: original.swimlaneId,
            cardNumber,
            title: original.title,
            description: original.description,
            priority: original.priority as Priority,
            position,
            startDate: config.nextRunAt,
            dueDate: newDueDate,
            estimatedHours: original.estimatedHours,
            createdById: original.createdById,
          },
        });

        // Copy labels
        if (original.labels.length > 0) {
          await this.prisma.cardLabel.createMany({
            data: original.labels.map((l) => ({
              cardId: newCard.id,
              labelId: l.labelId,
            })),
            skipDuplicates: true,
          });
        }

        // Copy checklists (structure only, items unchecked)
        for (const checklist of original.checklists) {
          const newChecklist = await this.prisma.checklist.create({
            data: {
              cardId: newCard.id,
              title: checklist.title,
              position: checklist.position,
            },
          });

          if (checklist.items.length > 0) {
            await this.prisma.checklistItem.createMany({
              data: checklist.items.map((item) => ({
                checklistId: newChecklist.id,
                title: item.title,
                isChecked: false,
                position: item.position,
              })),
            });
          }
        }

        // Advance nextRunAt to the next occurrence
        const newNextRunAt = this.computeNextRunAt(config.cronExpression);
        await this.prisma.recurringCardConfig.update({
          where: { id: config.id },
          data: { nextRunAt: newNextRunAt },
        });

        created++;
        this.logger.log(
          `Created recurring card ${newCard.id} from template ${original.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to process recurring card config ${config.id}: ${(err as Error).message}`,
        );
      }
    }

    return created;
  }
}
