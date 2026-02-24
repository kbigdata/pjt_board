import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ColumnType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnService {
  private readonly logger = new Logger(ColumnService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateColumnDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const lastColumn = await this.prisma.column.findFirst({
      where: { boardId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastColumn ? lastColumn.position + 1024 : 1024;

    return this.prisma.column.create({
      data: {
        boardId,
        title: dto.title,
        description: dto.description,
        columnType: dto.columnType ?? ColumnType.CUSTOM,
        wipLimit: dto.wipLimit,
        color: dto.color,
        position,
      },
    });
  }

  async findAllByBoardId(boardId: string) {
    return this.prisma.column.findMany({
      where: { boardId, archivedAt: null },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        cards: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return column;
  }

  async update(id: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.column.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.columnType !== undefined && { columnType: dto.columnType }),
        ...(dto.wipLimit !== undefined && { wipLimit: dto.wipLimit }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async move(id: string, position: number) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.column.update({
      where: { id },
      data: { position },
    });
  }

  async archive(id: string) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.column.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string) {
    const column = await this.prisma.column.findUnique({ where: { id } });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.column.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async deleteWithMigration(columnId: string, targetColumnId?: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: {
        cards: {
          where: { archivedAt: null },
          select: { id: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const hasCards = column.cards.length > 0;

    if (hasCards && !targetColumnId) {
      throw new BadRequestException(
        'Column has cards. Provide a target column to migrate them.',
      );
    }

    if (hasCards && targetColumnId) {
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: targetColumnId },
        include: {
          cards: {
            where: { archivedAt: null },
            select: { position: true },
            orderBy: { position: 'desc' },
          },
        },
      });

      if (!targetColumn) {
        throw new NotFoundException('Target column not found');
      }

      await this.prisma.$transaction(async (tx) => {
        const lastTargetPosition =
          targetColumn.cards.length > 0 ? targetColumn.cards[0].position : 0;

        let nextPosition = lastTargetPosition + 1024;
        for (const card of column.cards) {
          await tx.card.update({
            where: { id: card.id },
            data: {
              columnId: targetColumnId,
              position: nextPosition,
            },
          });
          nextPosition += 1024;
        }

        await tx.column.delete({ where: { id: columnId } });
      });

      this.logger.log(
        `Column "${column.title}" deleted; ${column.cards.length} card(s) migrated to column ${targetColumnId}`,
      );
    } else {
      await this.prisma.column.delete({ where: { id: columnId } });
      this.logger.log(`Column "${column.title}" deleted (no cards)`);
    }
  }

  async getBoardId(columnId: string): Promise<string | null> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    return column?.boardId ?? null;
  }
}
