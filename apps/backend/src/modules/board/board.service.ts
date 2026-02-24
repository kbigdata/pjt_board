import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Priority, Role, Visibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateBoardDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const lastBoard = await this.prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastBoard ? lastBoard.position + 1024 : 1024;

    const board = await this.prisma.$transaction(async (tx) => {
      const b = await tx.board.create({
        data: {
          workspaceId,
          title: dto.title,
          description: dto.description,
          visibility: dto.visibility ?? Visibility.PRIVATE,
          position,
          createdById: userId,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: b.id,
          userId,
          role: Role.OWNER,
        },
      });

      return b;
    });

    this.logger.log(`Board "${board.title}" created in workspace ${workspaceId}`);
    return board;
  }

  async findAllByWorkspaceId(workspaceId: string) {
    return this.prisma.board.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { members: true, cards: true },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        columns: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  async update(id: string, dto: UpdateBoardDto) {
    const board = await this.prisma.board.findUnique({ where: { id } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return this.prisma.board.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      },
    });
  }

  async archive(id: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.archivedAt) {
      throw new ConflictException('Board is already archived');
    }

    return this.prisma.board.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (!board.archivedAt) {
      throw new ConflictException('Board is not archived');
    }

    return this.prisma.board.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async delete(id: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.prisma.board.delete({ where: { id } });
    this.logger.log(`Board "${board.title}" permanently deleted`);
  }

  async permanentDelete(id: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.prisma.board.delete({ where: { id } });
    this.logger.log(`Board "${board.title}" permanently deleted (trash)`);
  }

  async cleanupExpiredArchives(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const expiredBoards = await this.prisma.board.findMany({
      where: {
        archivedAt: { not: null, lte: cutoff },
      },
      select: { id: true, title: true },
    });

    if (expiredBoards.length === 0) {
      return 0;
    }

    const ids = expiredBoards.map((b) => b.id);
    await this.prisma.board.deleteMany({ where: { id: { in: ids } } });

    for (const board of expiredBoards) {
      this.logger.log(`Expired archived board "${board.title}" (${board.id}) permanently deleted`);
    }

    return expiredBoards.length;
  }

  async addMember(boardId: string, userId: string, role: Role = Role.MEMBER) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this board');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.boardMember.create({
      data: { boardId, userId, role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async updateMemberRole(boardId: string, userId: string, role: Role) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this board');
    }

    if (member.role === Role.OWNER) {
      throw new ForbiddenException('Cannot change the role of the board owner');
    }

    return this.prisma.boardMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async removeMember(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this board');
    }

    if (member.role === Role.OWNER) {
      throw new ForbiddenException('Cannot remove the board owner');
    }

    await this.prisma.boardMember.delete({ where: { id: member.id } });
  }

  async getMemberRole(boardId: string, userId: string): Promise<Role | null> {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    return member?.role ?? null;
  }

  async findArchivedByWorkspaceId(workspaceId: string) {
    return this.prisma.board.findMany({
      where: { workspaceId, archivedAt: { not: null } },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });
  }

  async toggleFavorite(boardId: string, userId: string): Promise<{ favorited: boolean }> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const existing = await this.prisma.boardFavorite.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (existing) {
      await this.prisma.boardFavorite.delete({ where: { id: existing.id } });
      this.logger.log(`Board "${board.title}" removed from favorites by user ${userId}`);
      return { favorited: false };
    }

    await this.prisma.boardFavorite.create({
      data: { boardId, userId },
    });
    this.logger.log(`Board "${board.title}" added to favorites by user ${userId}`);
    return { favorited: true };
  }

  async findFavorites(userId: string) {
    const favorites = await this.prisma.boardFavorite.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            createdBy: {
              select: { id: true, name: true, avatarUrl: true },
            },
            _count: {
              select: { members: true, cards: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.board);
  }

  async exportToJson(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
        swimlanes: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
        labels: true,
        cards: {
          where: { archivedAt: null },
          include: {
            assignees: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            labels: { include: { label: true } },
            checklists: { include: { items: { orderBy: { position: 'asc' } } } },
            tags: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      board: {
        title: board.title,
        description: board.description,
        visibility: board.visibility,
        columns: board.columns,
        swimlanes: board.swimlanes,
        labels: board.labels,
        cards: board.cards,
      },
    };
  }

  async importFromJson(workspaceId: string, userId: string, data: Record<string, unknown>) {
    if (!data || !data['board']) {
      throw new BadRequestException('Invalid import data: missing board field');
    }

    const boardData = data['board'] as Record<string, unknown>;
    const columns = (boardData['columns'] as any[]) ?? [];
    const swimlanes = (boardData['swimlanes'] as any[]) ?? [];
    const labels = (boardData['labels'] as any[]) ?? [];
    const cards = (boardData['cards'] as any[]) ?? [];

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const lastBoard = await this.prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastBoard ? lastBoard.position + 1024 : 1024;

    return this.prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          workspaceId,
          title: (boardData['title'] as string) ?? 'Imported Board',
          description: boardData['description'] as string | undefined,
          visibility: (boardData['visibility'] as Visibility) ?? Visibility.PRIVATE,
          position,
          createdById: userId,
        },
      });

      await tx.boardMember.create({
        data: { boardId: newBoard.id, userId, role: Role.OWNER },
      });

      // Create columns and build mapping
      const columnIdMap: Record<string, string> = {};
      for (const col of columns) {
        const newCol = await tx.column.create({
          data: {
            boardId: newBoard.id,
            title: col.title ?? 'Column',
            columnType: col.columnType ?? 'CUSTOM',
            position: col.position ?? 1024,
            wipLimit: col.wipLimit ?? null,
            color: col.color ?? null,
          },
        });
        if (col.id) {
          columnIdMap[col.id] = newCol.id;
        }
      }

      // Create swimlanes and build mapping
      const swimlaneIdMap: Record<string, string> = {};
      for (const sw of swimlanes) {
        const newSw = await tx.swimlane.create({
          data: {
            boardId: newBoard.id,
            title: sw.title ?? 'Swimlane',
            position: sw.position ?? 1024,
            color: sw.color ?? null,
            isDefault: sw.isDefault ?? false,
          },
        });
        if (sw.id) {
          swimlaneIdMap[sw.id] = newSw.id;
        }
      }

      // Create labels and build mapping
      const labelIdMap: Record<string, string> = {};
      for (const lbl of labels) {
        const newLbl = await tx.label.create({
          data: {
            boardId: newBoard.id,
            name: lbl.name ?? 'Label',
            color: lbl.color ?? '#808080',
          },
        });
        if (lbl.id) {
          labelIdMap[lbl.id] = newLbl.id;
        }
      }

      // Create cards
      let cardNumber = 1;
      for (const card of cards) {
        const mappedColumnId = card.columnId ? (columnIdMap[card.columnId] ?? null) : null;
        if (!mappedColumnId) {
          continue;
        }

        const newCard = await tx.card.create({
          data: {
            boardId: newBoard.id,
            columnId: mappedColumnId,
            swimlaneId: card.swimlaneId ? (swimlaneIdMap[card.swimlaneId] ?? null) : null,
            cardNumber: cardNumber++,
            title: card.title ?? 'Card',
            description: card.description ?? null,
            priority: (card.priority as Priority) ?? Priority.MEDIUM,
            position: card.position ?? 1024,
            startDate: card.startDate ? new Date(card.startDate) : null,
            dueDate: card.dueDate ? new Date(card.dueDate) : null,
            estimatedHours: card.estimatedHours ?? null,
            createdById: userId,
          },
        });

        // Restore labels
        if (Array.isArray(card.labels)) {
          for (const cl of card.labels) {
            const mappedLabelId = cl.labelId ? (labelIdMap[cl.labelId] ?? null) : null;
            if (mappedLabelId) {
              await tx.cardLabel.create({ data: { cardId: newCard.id, labelId: mappedLabelId } });
            }
          }
        }

        // Restore tags
        if (Array.isArray(card.tags)) {
          for (const ct of card.tags) {
            if (ct.tag) {
              await tx.cardTag.create({ data: { cardId: newCard.id, tag: ct.tag } });
            }
          }
        }

        // Restore checklists
        if (Array.isArray(card.checklists)) {
          for (const checklist of card.checklists) {
            const newChecklist = await tx.checklist.create({
              data: {
                cardId: newCard.id,
                title: checklist.title ?? 'Checklist',
                position: checklist.position ?? 1024,
              },
            });
            if (Array.isArray(checklist.items)) {
              for (const item of checklist.items) {
                await tx.checklistItem.create({
                  data: {
                    checklistId: newChecklist.id,
                    title: item.title ?? 'Item',
                    position: item.position ?? 1024,
                    isChecked: false,
                  },
                });
              }
            }
          }
        }
      }

      this.logger.log(
        `Board imported as "${newBoard.title}" (${newBoard.id}) in workspace ${workspaceId}`,
      );
      return newBoard;
    });
  }
}
