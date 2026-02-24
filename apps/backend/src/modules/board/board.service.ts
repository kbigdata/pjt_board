import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Role, Visibility } from '@prisma/client';
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
}
