import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(boardId: string, dto: CreateCustomFieldDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const lastField = await this.prisma.customFieldDefinition.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastField ? lastField.position + 1024 : 1024;

    return this.prisma.customFieldDefinition.create({
      data: {
        boardId,
        name: dto.name,
        fieldType: dto.fieldType,
        options: dto.options !== undefined ? dto.options : Prisma.JsonNull,
        position,
        isRequired: dto.isRequired ?? false,
      },
    });
  }

  async findDefinitionsByBoardId(boardId: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });
  }

  async updateDefinition(id: string, dto: UpdateCustomFieldDto) {
    const field = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!field) {
      throw new NotFoundException('Custom field definition not found');
    }

    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
      },
    });
  }

  async deleteDefinition(id: string) {
    const field = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!field) {
      throw new NotFoundException('Custom field definition not found');
    }

    await this.prisma.customFieldDefinition.delete({ where: { id } });
  }

  async setValue(cardId: string, fieldId: string, value: string | number | boolean | null) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const field = await this.prisma.customFieldDefinition.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Custom field definition not found');
    }

    const jsonValue = value === null ? Prisma.JsonNull : value;

    return this.prisma.customFieldValue.upsert({
      where: { cardId_fieldId: { cardId, fieldId } },
      create: { cardId, fieldId, value: jsonValue },
      update: { value: jsonValue },
      include: { field: true },
    });
  }

  async getValuesByCardId(cardId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { cardId },
      include: { field: true },
      orderBy: { field: { position: 'asc' } },
    });
  }

  async deleteValue(cardId: string, fieldId: string) {
    const value = await this.prisma.customFieldValue.findUnique({
      where: { cardId_fieldId: { cardId, fieldId } },
    });

    if (!value) {
      throw new NotFoundException('Custom field value not found');
    }

    await this.prisma.customFieldValue.delete({
      where: { cardId_fieldId: { cardId, fieldId } },
    });
  }

  async getBoardIdByFieldId(fieldId: string): Promise<string | null> {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldId },
      select: { boardId: true },
    });
    return field?.boardId ?? null;
  }
}
