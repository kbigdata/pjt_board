import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CardTagService {
  private readonly logger = new Logger(CardTagService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addTag(cardId: string, tag: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.prisma.cardTag.upsert({
      where: { cardId_tag: { cardId, tag } },
      create: { cardId, tag },
      update: {},
    });
  }

  async findByCardId(cardId: string) {
    return this.prisma.cardTag.findMany({
      where: { cardId },
      orderBy: { tag: 'asc' },
    });
  }

  async removeTag(cardId: string, tag: string) {
    const cardTag = await this.prisma.cardTag.findUnique({
      where: { cardId_tag: { cardId, tag } },
    });

    if (!cardTag) {
      throw new NotFoundException('Tag not found on this card');
    }

    await this.prisma.cardTag.delete({ where: { id: cardTag.id } });
  }

  async getCardId(tagId: string): Promise<string | null> {
    const cardTag = await this.prisma.cardTag.findUnique({
      where: { id: tagId },
      select: { cardId: true },
    });
    return cardTag?.cardId ?? null;
  }
}
