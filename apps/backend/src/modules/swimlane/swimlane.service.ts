import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSwimlaneDto } from './dto/create-swimlane.dto';
import { UpdateSwimlaneDto } from './dto/update-swimlane.dto';

@Injectable()
export class SwimlaneService {
  private readonly logger = new Logger(SwimlaneService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateSwimlaneDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const lastSwimlane = await this.prisma.swimlane.findFirst({
      where: { boardId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastSwimlane ? lastSwimlane.position + 1024 : 1024;

    return this.prisma.swimlane.create({
      data: {
        boardId,
        title: dto.title,
        color: dto.color,
        position,
      },
    });
  }

  async findAllByBoardId(boardId: string) {
    return this.prisma.swimlane.findMany({
      where: { boardId, archivedAt: null },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string) {
    const swimlane = await this.prisma.swimlane.findUnique({ where: { id } });
    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }
    return swimlane;
  }

  async update(id: string, dto: UpdateSwimlaneDto) {
    const swimlane = await this.prisma.swimlane.findUnique({ where: { id } });
    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }

    return this.prisma.swimlane.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async move(id: string, position: number) {
    const swimlane = await this.prisma.swimlane.findUnique({ where: { id } });
    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }

    return this.prisma.swimlane.update({
      where: { id },
      data: { position },
    });
  }

  async archive(id: string) {
    const swimlane = await this.prisma.swimlane.findUnique({ where: { id } });
    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }

    return this.prisma.swimlane.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string) {
    const swimlane = await this.prisma.swimlane.findUnique({ where: { id } });
    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }

    return this.prisma.swimlane.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async delete(id: string): Promise<void> {
    const swimlane = await this.prisma.swimlane.findUnique({
      where: { id },
      include: {
        _count: { select: { cards: true } },
      },
    });

    if (!swimlane) {
      throw new NotFoundException('Swimlane not found');
    }

    if (swimlane._count.cards > 0) {
      throw new BadRequestException(
        'Cannot delete a swimlane that has cards. Archive it or reassign the cards first.',
      );
    }

    await this.prisma.swimlane.delete({ where: { id } });
    this.logger.log(`Deleted swimlane "${swimlane.title}" (${id})`);
  }

  async getBoardId(swimlaneId: string): Promise<string | null> {
    const swimlane = await this.prisma.swimlane.findUnique({
      where: { id: swimlaneId },
      select: { boardId: true },
    });
    return swimlane?.boardId ?? null;
  }
}
