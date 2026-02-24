import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Priority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateCardDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const column = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
    if (!column || column.boardId !== boardId) {
      throw new NotFoundException('Column not found in this board');
    }

    const lastCard = await this.prisma.card.findFirst({
      where: { columnId: dto.columnId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastCard ? lastCard.position + 1024 : 1024;

    const maxCardNumber = await this.prisma.card.aggregate({
      where: { boardId },
      _max: { cardNumber: true },
    });

    const cardNumber = (maxCardNumber._max.cardNumber ?? 0) + 1;

    return this.prisma.card.create({
      data: {
        boardId,
        columnId: dto.columnId,
        swimlaneId: dto.swimlaneId,
        cardNumber,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? Priority.MEDIUM,
        position,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedHours: dto.estimatedHours,
        createdById: boardId, // will be overridden by controller
      },
    });
  }

  async createForUser(boardId: string, userId: string, dto: CreateCardDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const column = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
    if (!column || column.boardId !== boardId) {
      throw new NotFoundException('Column not found in this board');
    }

    const lastCard = await this.prisma.card.findFirst({
      where: { columnId: dto.columnId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastCard ? lastCard.position + 1024 : 1024;

    const maxCardNumber = await this.prisma.card.aggregate({
      where: { boardId },
      _max: { cardNumber: true },
    });

    const cardNumber = (maxCardNumber._max.cardNumber ?? 0) + 1;

    return this.prisma.card.create({
      data: {
        boardId,
        columnId: dto.columnId,
        swimlaneId: dto.swimlaneId,
        cardNumber,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? Priority.MEDIUM,
        position,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedHours: dto.estimatedHours,
        createdById: userId,
      },
      include: {
        column: { select: { id: true, title: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
  }

  async findAllByBoardId(boardId: string) {
    return this.prisma.card.findMany({
      where: { boardId, archivedAt: null },
      include: {
        column: { select: { id: true, title: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        labels: {
          include: { label: true },
        },
        _count: { select: { comments: true, checklists: true, attachments: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        column: { select: { id: true, title: true } },
        swimlane: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        labels: { include: { label: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        checklists: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        tags: true,
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async update(id: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
      },
    });
  }

  async move(id: string, dto: MoveCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.card.update({
      where: { id },
      data: {
        columnId: dto.columnId,
        swimlaneId: dto.swimlaneId ?? null,
        position: dto.position,
      },
    });
  }

  async archive(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.card.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.card.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async delete(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.prisma.card.delete({ where: { id } });
  }

  async getBoardId(cardId: string): Promise<string | null> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    return card?.boardId ?? null;
  }

  async addAssignee(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.cardAssignee.create({
      data: { cardId, userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async removeAssignee(cardId: string, userId: string) {
    const assignee = await this.prisma.cardAssignee.findUnique({
      where: { cardId_userId: { cardId, userId } },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    await this.prisma.cardAssignee.delete({ where: { id: assignee.id } });
  }
}
