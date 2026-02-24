import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cardId: string, dto: CreateChecklistDto) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const lastChecklist = await this.prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastChecklist ? lastChecklist.position + 1024 : 1024;

    return this.prisma.checklist.create({
      data: {
        cardId,
        title: dto.title,
        position,
      },
      include: { items: true },
    });
  }

  async findAllByCardId(cardId: string) {
    return this.prisma.checklist.findMany({
      where: { cardId },
      include: {
        items: { orderBy: { position: 'asc' } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async update(id: string, dto: CreateChecklistDto) {
    const checklist = await this.prisma.checklist.findUnique({ where: { id } });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    return this.prisma.checklist.update({
      where: { id },
      data: { title: dto.title },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async delete(id: string) {
    const checklist = await this.prisma.checklist.findUnique({ where: { id } });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    await this.prisma.checklist.delete({ where: { id } });
  }

  async addItem(checklistId: string, dto: CreateChecklistItemDto) {
    const checklist = await this.prisma.checklist.findUnique({ where: { id: checklistId } });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    const lastItem = await this.prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastItem ? lastItem.position + 1024 : 1024;

    return this.prisma.checklistItem.create({
      data: {
        checklistId,
        title: dto.title,
        position,
      },
    });
  }

  async toggleItem(itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: { isChecked: !item.isChecked },
    });
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    await this.prisma.checklistItem.delete({ where: { id: itemId } });
  }

  async getCardId(checklistId: string): Promise<string | null> {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
      select: { cardId: true },
    });
    return checklist?.cardId ?? null;
  }

  async getCardIdFromItem(itemId: string): Promise<string | null> {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { select: { cardId: true } } },
    });
    return item?.checklist?.cardId ?? null;
  }
}
