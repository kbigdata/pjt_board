import {
  Injectable,
  NotFoundException,
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

  async getBoardId(columnId: string): Promise<string | null> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    return column?.boardId ?? null;
  }
}
