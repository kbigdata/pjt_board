import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(page: number = 1, limit: number = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          isAdmin: true,
          deactivatedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
        deactivatedAt: true,
        createdAt: true,
        updatedAt: true,
        workspaceMembers: {
          include: {
            workspace: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserAdmin(userId: string, data: { isAdmin?: boolean; deactivated?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.isAdmin !== undefined) {
      updateData.isAdmin = data.isAdmin;
    }

    if (data.deactivated !== undefined) {
      updateData.deactivatedAt = data.deactivated ? new Date() : null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
        deactivatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User ${userId} updated by admin: ${JSON.stringify(data)}`);
    return updated;
  }

  async resetUserPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    this.logger.log(`Password reset for user ${userId} by admin`);
    return { temporaryPassword: tempPassword };
  }

  async findAllWorkspaces(page: number = 1, limit: number = 20, search?: string) {
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        include: {
          _count: { select: { members: true, boards: true } },
          members: {
            where: { role: 'OWNER' },
            include: { user: { select: { id: true, name: true, email: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return {
      data: workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        owner: ws.members[0]?.user || null,
        memberCount: ws._count.members,
        boardCount: ws._count.boards,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkspaceDetail(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        boards: {
          select: { id: true, title: true, visibility: true, createdAt: true, archivedAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      totalWorkspaces,
      totalBoards,
      totalCards,
      activeBoards,
      archivedBoards,
      totalSprints,
      activeSprints,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { deactivatedAt: null } }),
      this.prisma.workspace.count(),
      this.prisma.board.count(),
      this.prisma.card.count(),
      this.prisma.board.count({ where: { archivedAt: null } }),
      this.prisma.board.count({ where: { archivedAt: { not: null } } }),
      this.prisma.sprint.count(),
      this.prisma.sprint.count({ where: { status: 'ACTIVE' } }),
    ]);

    const [recentUsers, recentBoards, recentWorkspaces] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.board.findMany({
        select: {
          id: true,
          title: true,
          createdAt: true,
          workspace: { select: { name: true } },
          _count: { select: { cards: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.workspace.findMany({
        include: {
          _count: { select: { members: true, boards: true } },
          members: {
            where: { role: 'OWNER' },
            include: { user: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalWorkspaces,
      totalBoards,
      totalCards,
      activeBoards,
      archivedBoards,
      totalSprints,
      activeSprints,
      recentUsers,
      recentBoards: recentBoards.map((b) => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt,
        workspaceName: b.workspace.name,
        cardCount: b._count.cards,
      })),
      recentWorkspaces: recentWorkspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        createdAt: ws.createdAt,
        memberCount: ws._count.members,
        boardCount: ws._count.boards,
        ownerName: ws.members[0]?.user?.name ?? '-',
      })),
    };
  }

  async getSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSettings(settings: { key: string; value: string }[]) {
    const results = await this.prisma.$transaction(
      settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        }),
      ),
    );

    this.logger.log(`System settings updated: ${settings.map((s) => s.key).join(', ')}`);
    return results;
  }
}
