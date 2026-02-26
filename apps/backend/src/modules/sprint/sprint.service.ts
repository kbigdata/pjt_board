import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SprintStatus, ColumnType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintService {
  private readonly logger = new Logger(SprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateSprintDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        boardId,
        name: dto.name,
        goal: dto.goal,
        startDate: start,
        endDate: end,
        status: SprintStatus.PLANNING,
      },
      include: {
        _count: { select: { cards: true } },
      },
    });

    this.logger.log(`Created sprint "${sprint.name}" (${sprint.id}) on board ${boardId}`);
    return sprint;
  }

  async findAllByBoardId(boardId: string) {
    return this.prisma.sprint.findMany({
      where: { boardId },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findActiveByBoardId(boardId: string) {
    return this.prisma.sprint.findFirst({
      where: { boardId, status: SprintStatus.ACTIVE },
      include: {
        _count: { select: { cards: true } },
      },
    });
  }

  async findById(id: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        _count: { select: { cards: true } },
      },
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    return sprint;
  }

  async update(id: string, dto: UpdateSprintDto) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.status !== SprintStatus.PLANNING) {
      throw new BadRequestException('Only sprints in PLANNING status can be updated');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : sprint.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : sprint.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.startDate !== undefined && { startDate }),
        ...(dto.endDate !== undefined && { endDate }),
      },
      include: {
        _count: { select: { cards: true } },
      },
    });
  }

  async start(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.status !== SprintStatus.PLANNING) {
      throw new BadRequestException('Only PLANNING sprints can be started');
    }

    const activeSprint = await this.prisma.sprint.findFirst({
      where: { boardId: sprint.boardId, status: SprintStatus.ACTIVE },
    });
    if (activeSprint) {
      throw new BadRequestException(
        `Board already has an active sprint: "${activeSprint.name}"`,
      );
    }

    const updated = await this.prisma.sprint.update({
      where: { id },
      data: { status: SprintStatus.ACTIVE },
      include: {
        _count: { select: { cards: true } },
      },
    });

    this.logger.log(`Started sprint "${updated.name}" (${id})`);
    return updated;
  }

  async complete(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE sprints can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find DONE columns on this board
      const doneColumns = await tx.column.findMany({
        where: { boardId: sprint.boardId, columnType: ColumnType.DONE, archivedAt: null },
        select: { id: true },
      });
      const doneColumnIds = doneColumns.map((c) => c.id);

      // Unassign cards that are NOT in DONE columns
      await tx.card.updateMany({
        where: {
          sprintId: id,
          columnId: { notIn: doneColumnIds.length > 0 ? doneColumnIds : ['__none__'] },
        },
        data: { sprintId: null },
      });

      const completed = await tx.sprint.update({
        where: { id },
        data: {
          status: SprintStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          _count: { select: { cards: true } },
        },
      });

      this.logger.log(`Completed sprint "${completed.name}" (${id})`);
      return completed;
    });
  }

  async cancel(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (
      sprint.status !== SprintStatus.ACTIVE &&
      sprint.status !== SprintStatus.PLANNING
    ) {
      throw new BadRequestException('Only ACTIVE or PLANNING sprints can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Unassign all cards from this sprint
      await tx.card.updateMany({
        where: { sprintId: id },
        data: { sprintId: null },
      });

      const cancelled = await tx.sprint.update({
        where: { id },
        data: { status: SprintStatus.CANCELLED },
        include: {
          _count: { select: { cards: true } },
        },
      });

      this.logger.log(`Cancelled sprint "${cancelled.name}" (${id})`);
      return cancelled;
    });
  }

  async addCards(sprintId: string, cardIds: string[]) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (
      sprint.status === SprintStatus.COMPLETED ||
      sprint.status === SprintStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot add cards to a COMPLETED or CANCELLED sprint',
      );
    }

    await this.prisma.card.updateMany({
      where: { id: { in: cardIds } },
      data: { sprintId },
    });

    this.logger.log(`Added ${cardIds.length} card(s) to sprint "${sprint.name}" (${sprintId})`);
    return { sprintId, cardIds };
  }

  async removeCards(sprintId: string, cardIds: string[]) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.card.updateMany({
      where: { id: { in: cardIds }, sprintId },
      data: { sprintId: null },
    });

    this.logger.log(`Removed ${cardIds.length} card(s) from sprint "${sprint.name}" (${sprintId})`);
    return { sprintId, cardIds };
  }

  async getProgress(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const cards = await this.prisma.card.findMany({
      where: { sprintId, archivedAt: null },
      select: { column: { select: { columnType: true } } },
    });

    const total = cards.length;
    let done = 0;
    let inProgress = 0;
    let todo = 0;

    for (const card of cards) {
      switch (card.column.columnType) {
        case ColumnType.DONE:
          done++;
          break;
        case ColumnType.IN_PROGRESS:
          inProgress++;
          break;
        default:
          todo++;
          break;
      }
    }

    const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, inProgress, todo, percentComplete };
  }

  async getBoardId(sprintId: string): Promise<string | null> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { boardId: true },
    });
    return sprint?.boardId ?? null;
  }
}
