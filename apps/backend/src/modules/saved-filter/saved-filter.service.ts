import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';

@Injectable()
export class SavedFilterService {
  private readonly logger = new Logger(SavedFilterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, userId: string, dto: CreateSavedFilterDto) {
    this.logger.debug(`Creating saved filter "${dto.name}" for board ${boardId} by user ${userId}`);
    return this.prisma.savedFilter.create({
      data: {
        boardId,
        userId,
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
      },
    });
  }

  async findByBoardAndUser(boardId: string, userId: string) {
    return this.prisma.savedFilter.findMany({
      where: { boardId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateSavedFilterDto) {
    const filter = await this.prisma.savedFilter.findUnique({ where: { id } });

    if (!filter) {
      throw new NotFoundException('Saved filter not found');
    }

    if (filter.userId !== userId) {
      throw new ForbiddenException('You can only update your own saved filters');
    }

    return this.prisma.savedFilter.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.filters !== undefined && { filters: dto.filters as Prisma.InputJsonValue }),
      },
    });
  }

  async delete(id: string, userId: string) {
    const filter = await this.prisma.savedFilter.findUnique({ where: { id } });

    if (!filter) {
      throw new NotFoundException('Saved filter not found');
    }

    if (filter.userId !== userId) {
      throw new ForbiddenException('You can only delete your own saved filters');
    }

    await this.prisma.savedFilter.delete({ where: { id } });
  }
}
