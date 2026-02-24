import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateLabelDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return this.prisma.label.create({
      data: {
        boardId,
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async findAllByBoardId(boardId: string) {
    return this.prisma.label.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) {
      throw new NotFoundException('Label not found');
    }

    return this.prisma.label.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async delete(id: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.prisma.label.delete({ where: { id } });
  }

  async addToCard(labelId: string, cardId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Label not found');
    }

    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const existing = await this.prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    });

    if (existing) {
      throw new ConflictException('Label already assigned to this card');
    }

    return this.prisma.cardLabel.create({
      data: { cardId, labelId },
      include: { label: true },
    });
  }

  async removeFromCard(labelId: string, cardId: string) {
    const cardLabel = await this.prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    });

    if (!cardLabel) {
      throw new NotFoundException('Label not assigned to this card');
    }

    await this.prisma.cardLabel.delete({ where: { id: cardLabel.id } });
  }

  async getBoardId(labelId: string): Promise<string | null> {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: { boardId: true },
    });
    return label?.boardId ?? null;
  }
}
