import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Role, Visibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface ColumnSnapshot {
  title: string;
  columnType: string;
  position: number;
  wipLimit?: number | null;
  color?: string | null;
}

interface SwimlaneSnapshot {
  title: string;
  position: number;
  color?: string | null;
  isDefault: boolean;
}

interface LabelSnapshot {
  name: string;
  color: string;
}

interface TemplateData {
  columns: ColumnSnapshot[];
  swimlanes: SwimlaneSnapshot[];
  labels: LabelSnapshot[];
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFromBoard(
    boardId: string,
    userId: string,
    name: string,
    description?: string,
  ) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
          select: {
            title: true,
            columnType: true,
            position: true,
            wipLimit: true,
            color: true,
          },
        },
        swimlanes: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
          select: {
            title: true,
            position: true,
            color: true,
            isDefault: true,
          },
        },
        labels: {
          select: { name: true, color: true },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const templateData: TemplateData = {
      columns: board.columns.map((col) => ({
        title: col.title,
        columnType: col.columnType,
        position: col.position,
        wipLimit: col.wipLimit,
        color: col.color,
      })),
      swimlanes: board.swimlanes.map((sw) => ({
        title: sw.title,
        position: sw.position,
        color: sw.color,
        isDefault: sw.isDefault,
      })),
      labels: board.labels.map((lbl) => ({
        name: lbl.name,
        color: lbl.color,
      })),
    };

    const template = await this.prisma.boardTemplate.create({
      data: {
        name,
        description,
        templateData: templateData as object,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.logger.log(`Template "${name}" created from board "${boardId}" by user "${userId}"`);
    return template;
  }

  async findAll() {
    return this.prisma.boardTemplate.findMany({
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.boardTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async applyTemplate(
    templateId: string,
    workspaceId: string,
    userId: string,
    boardTitle: string,
  ) {
    const template = await this.findById(templateId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const templateData = template.templateData as unknown as TemplateData;

    const lastBoard = await this.prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastBoard ? lastBoard.position + 1024 : 1024;

    const board = await this.prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          workspaceId,
          title: boardTitle,
          visibility: Visibility.PRIVATE,
          position,
          createdById: userId,
        },
      });

      await tx.boardMember.create({
        data: { boardId: newBoard.id, userId, role: Role.OWNER },
      });

      if (Array.isArray(templateData.columns)) {
        await tx.column.createMany({
          data: templateData.columns.map((col) => ({
            boardId: newBoard.id,
            title: col.title,
            columnType: col.columnType as any,
            position: col.position,
            wipLimit: col.wipLimit ?? null,
            color: col.color ?? null,
          })),
        });
      }

      if (Array.isArray(templateData.swimlanes)) {
        await tx.swimlane.createMany({
          data: templateData.swimlanes.map((sw) => ({
            boardId: newBoard.id,
            title: sw.title,
            position: sw.position,
            color: sw.color ?? null,
            isDefault: sw.isDefault,
          })),
        });
      }

      if (Array.isArray(templateData.labels)) {
        await tx.label.createMany({
          data: templateData.labels.map((lbl) => ({
            boardId: newBoard.id,
            name: lbl.name,
            color: lbl.color,
          })),
        });
      }

      return newBoard;
    });

    this.logger.log(
      `Board "${boardTitle}" created from template "${template.name}" in workspace "${workspaceId}"`,
    );
    return board;
  }

  async delete(id: string) {
    const template = await this.prisma.boardTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.boardTemplate.delete({ where: { id } });
    this.logger.log(`Template "${template.name}" deleted`);
  }
}
