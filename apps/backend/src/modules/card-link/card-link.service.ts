import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { LinkType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CardLinkService {
  private readonly logger = new Logger(CardLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(sourceCardId: string, targetCardId: string, linkType: LinkType, userId: string) {
    const sourceCard = await this.prisma.card.findUnique({ where: { id: sourceCardId } });
    if (!sourceCard) {
      throw new NotFoundException('Source card not found');
    }

    const targetCard = await this.prisma.card.findUnique({ where: { id: targetCardId } });
    if (!targetCard) {
      throw new NotFoundException('Target card not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const link = await tx.cardLink.create({
        data: {
          sourceCardId,
          targetCardId,
          linkType,
        },
        include: {
          sourceCard: { select: { id: true, title: true, cardNumber: true } },
          targetCard: { select: { id: true, title: true, cardNumber: true } },
        },
      });

      if (linkType === LinkType.BLOCKS) {
        await tx.cardLink.upsert({
          where: {
            sourceCardId_targetCardId_linkType: {
              sourceCardId: targetCardId,
              targetCardId: sourceCardId,
              linkType: LinkType.BLOCKED_BY,
            },
          },
          create: {
            sourceCardId: targetCardId,
            targetCardId: sourceCardId,
            linkType: LinkType.BLOCKED_BY,
          },
          update: {},
        });
      }

      return link;
    });
  }

  async findByCardId(cardId: string) {
    return this.prisma.cardLink.findMany({
      where: {
        OR: [{ sourceCardId: cardId }, { targetCardId: cardId }],
      },
      include: {
        sourceCard: { select: { id: true, title: true, cardNumber: true } },
        targetCard: { select: { id: true, title: true, cardNumber: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(id: string, userId: string) {
    const link = await this.prisma.cardLink.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Card link not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardLink.delete({ where: { id } });

      if (link.linkType === LinkType.BLOCKS) {
        await tx.cardLink.deleteMany({
          where: {
            sourceCardId: link.targetCardId,
            targetCardId: link.sourceCardId,
            linkType: LinkType.BLOCKED_BY,
          },
        });
      } else if (link.linkType === LinkType.BLOCKED_BY) {
        await tx.cardLink.deleteMany({
          where: {
            sourceCardId: link.targetCardId,
            targetCardId: link.sourceCardId,
            linkType: LinkType.BLOCKS,
          },
        });
      }
    });
  }

  async getSourceCardId(linkId: string): Promise<string | null> {
    const link = await this.prisma.cardLink.findUnique({
      where: { id: linkId },
      select: { sourceCardId: true },
    });
    return link?.sourceCardId ?? null;
  }
}
