import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ColumnType, Priority, Role, Visibility } from '@prisma/client';
import { BoardService } from './board.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BoardService', () => {
  let service: BoardService;
  let prisma: Record<string, any>;

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    ownerId: 'user-1',
  };

  const mockBoard = {
    id: 'board-1',
    workspaceId: 'ws-1',
    title: 'Sprint Board',
    description: 'Test board',
    visibility: Visibility.PRIVATE,
    position: 1024,
    createdById: 'user-1',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'bm-1',
    boardId: 'board-1',
    userId: 'user-1',
    role: Role.OWNER,
    joinedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      workspace: {
        findUnique: jest.fn(),
      },
      board: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      boardMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      boardFavorite: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      column: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      swimlane: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      label: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      card: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      cardLabel: {
        create: jest.fn(),
      },
      cardTag: {
        create: jest.fn(),
      },
      checklist: {
        create: jest.fn(),
      },
      checklistItem: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
  });

  describe('create', () => {
    it('should create board and add creator as OWNER', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.board.findFirst.mockResolvedValue(null);
      prisma.board.create.mockResolvedValue(mockBoard);
      prisma.boardMember.create.mockResolvedValue(mockMember);

      const result = await service.create('ws-1', 'user-1', {
        title: 'Sprint Board',
        description: 'Test board',
      });

      expect(result).toEqual(mockBoard);
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          title: 'Sprint Board',
          createdById: 'user-1',
          position: 1024,
        }),
      });
      expect(prisma.boardMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boardId: 'board-1',
          userId: 'user-1',
          role: Role.OWNER,
        }),
      });
    });

    it('should position after last board', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.board.findFirst.mockResolvedValue({ position: 2048 });
      prisma.board.create.mockResolvedValue({ ...mockBoard, position: 3072 });
      prisma.boardMember.create.mockResolvedValue(mockMember);

      const result = await service.create('ws-1', 'user-1', { title: 'Board 2' });

      expect(result.position).toBe(3072);
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent', 'user-1', { title: 'Board' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('should return non-archived boards', async () => {
      prisma.board.findMany.mockResolvedValue([
        {
          ...mockBoard,
          createdBy: { id: 'user-1', name: 'Test', avatarUrl: null },
          _count: { members: 2, cards: 5 },
        },
      ]);

      const result = await service.findAllByWorkspaceId('ws-1');

      expect(result).toHaveLength(1);
      expect(prisma.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws-1', archivedAt: null },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return board with members and columns', async () => {
      const boardWithDetails = {
        ...mockBoard,
        createdBy: { id: 'user-1', name: 'Test', email: 'test@test.com', avatarUrl: null },
        members: [{ ...mockMember, user: { id: 'user-1', name: 'Test', email: 'test@test.com', avatarUrl: null } }],
        columns: [],
        _count: { cards: 0 },
      };
      prisma.board.findUnique.mockResolvedValue(boardWithDetails);

      const result = await service.findById('board-1');

      expect(result.id).toBe('board-1');
      expect(result.members).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update board fields', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, title: 'Updated Title' });

      const result = await service.update('board-1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('should set archivedAt on board', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, archivedAt: new Date() });

      const result = await service.archive('board-1');

      expect(result.archivedAt).toBeTruthy();
      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it('should throw ConflictException if already archived', async () => {
      prisma.board.findUnique.mockResolvedValue({ ...mockBoard, archivedAt: new Date() });

      await expect(service.archive('board-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.archive('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should clear archivedAt', async () => {
      prisma.board.findUnique.mockResolvedValue({ ...mockBoard, archivedAt: new Date() });
      prisma.board.update.mockResolvedValue({ ...mockBoard, archivedAt: null });

      const result = await service.restore('board-1');

      expect(result.archivedAt).toBeNull();
    });

    it('should throw ConflictException if not archived', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);

      await expect(service.restore('board-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should permanently delete board', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.delete.mockResolvedValue(mockBoard);

      await service.delete('board-1');

      expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete an archived board', async () => {
      const archivedBoard = { ...mockBoard, archivedAt: new Date() };
      prisma.board.findUnique.mockResolvedValue(archivedBoard);
      prisma.board.delete.mockResolvedValue(archivedBoard);

      await service.permanentDelete('board-1');

      expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.permanentDelete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cleanupExpiredArchives', () => {
    it('should delete boards archived more than 30 days ago and return count', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const expiredBoards = [
        { id: 'board-1', title: 'Old Board 1' },
        { id: 'board-2', title: 'Old Board 2' },
      ];
      prisma.board.findMany.mockResolvedValue(expiredBoards);
      prisma.board.deleteMany = jest.fn().mockResolvedValue({ count: 2 });

      const count = await service.cleanupExpiredArchives();

      expect(count).toBe(2);
      expect(prisma.board.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['board-1', 'board-2'] } },
      });
    });

    it('should return 0 when no expired boards exist', async () => {
      prisma.board.findMany.mockResolvedValue([]);
      prisma.board.deleteMany = jest.fn();

      const count = await service.cleanupExpiredArchives();

      expect(count).toBe(0);
      expect(prisma.board.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should add a new member', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardMember.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.boardMember.create.mockResolvedValue({
        id: 'bm-2',
        boardId: 'board-1',
        userId: 'user-2',
        role: Role.MEMBER,
        joinedAt: new Date(),
        user: { id: 'user-2', name: 'User 2', email: 'u2@test.com', avatarUrl: null },
      });

      const result = await service.addMember('board-1', 'user-2', Role.MEMBER);

      expect(result.userId).toBe('user-2');
      expect(result.role).toBe(Role.MEMBER);
    });

    it('should throw ConflictException for duplicate member', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardMember.findUnique.mockResolvedValue(mockMember);

      await expect(
        service.addMember('board-1', 'user-1', Role.MEMBER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('non-existent', 'user-2', Role.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardMember.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('board-1', 'non-existent', Role.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const memberRecord = { ...mockMember, role: Role.MEMBER, userId: 'user-2' };
      prisma.boardMember.findUnique.mockResolvedValue(memberRecord);
      prisma.boardMember.update.mockResolvedValue({
        ...memberRecord,
        role: Role.ADMIN,
        user: { id: 'user-2', name: 'User 2', email: 'u2@test.com', avatarUrl: null },
      });

      const result = await service.updateMemberRole('board-1', 'user-2', Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should throw ForbiddenException when changing OWNER role', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(mockMember);

      await expect(
        service.updateMemberRole('board-1', 'user-1', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('board-1', 'non-existent', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      const memberRecord = { ...mockMember, role: Role.MEMBER, userId: 'user-2' };
      prisma.boardMember.findUnique.mockResolvedValue(memberRecord);
      prisma.boardMember.delete.mockResolvedValue(memberRecord);

      await service.removeMember('board-1', 'user-2');

      expect(prisma.boardMember.delete).toHaveBeenCalledWith({ where: { id: memberRecord.id } });
    });

    it('should throw ForbiddenException when removing OWNER', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(mockMember);

      await expect(service.removeMember('board-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('board-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMemberRole', () => {
    it('should return role for existing member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(mockMember);

      const role = await service.getMemberRole('board-1', 'user-1');

      expect(role).toBe(Role.OWNER);
    });

    it('should return null for non-member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      const role = await service.getMemberRole('board-1', 'non-existent');

      expect(role).toBeNull();
    });
  });

  describe('findArchivedByWorkspaceId', () => {
    it('should return only archived boards', async () => {
      prisma.board.findMany.mockResolvedValue([
        {
          ...mockBoard,
          archivedAt: new Date(),
          createdBy: { id: 'user-1', name: 'Test', avatarUrl: null },
        },
      ]);

      const result = await service.findArchivedByWorkspaceId('ws-1');

      expect(result).toHaveLength(1);
      expect(prisma.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws-1', archivedAt: { not: null } },
        }),
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should add board to favorites when not yet favorited', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardFavorite.findUnique.mockResolvedValue(null);
      prisma.boardFavorite.create.mockResolvedValue({
        id: 'fav-1',
        boardId: 'board-1',
        userId: 'user-1',
        createdAt: new Date(),
      });

      const result = await service.toggleFavorite('board-1', 'user-1');

      expect(result).toEqual({ favorited: true });
      expect(prisma.boardFavorite.create).toHaveBeenCalledWith({
        data: { boardId: 'board-1', userId: 'user-1' },
      });
    });

    it('should remove board from favorites when already favorited', async () => {
      const existingFavorite = {
        id: 'fav-1',
        boardId: 'board-1',
        userId: 'user-1',
        createdAt: new Date(),
      };
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardFavorite.findUnique.mockResolvedValue(existingFavorite);
      prisma.boardFavorite.delete.mockResolvedValue(existingFavorite);

      const result = await service.toggleFavorite('board-1', 'user-1');

      expect(result).toEqual({ favorited: false });
      expect(prisma.boardFavorite.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.toggleFavorite('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findFavorites', () => {
    it('should return favorited boards for a user', async () => {
      const boardWithDetails = {
        ...mockBoard,
        createdBy: { id: 'user-1', name: 'Test', avatarUrl: null },
        _count: { members: 2, cards: 5 },
      };
      prisma.boardFavorite.findMany.mockResolvedValue([
        { id: 'fav-1', boardId: 'board-1', userId: 'user-1', createdAt: new Date(), board: boardWithDetails },
      ]);

      const result = await service.findFavorites('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('board-1');
      expect(prisma.boardFavorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when user has no favorites', async () => {
      prisma.boardFavorite.findMany.mockResolvedValue([]);

      const result = await service.findFavorites('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('exportToJson', () => {
    const mockBoardWithDetails = {
      ...mockBoard,
      columns: [
        {
          id: 'col-1',
          boardId: 'board-1',
          title: 'To Do',
          columnType: ColumnType.TODO,
          position: 1024,
          wipLimit: null,
          color: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      swimlanes: [
        {
          id: 'sw-1',
          boardId: 'board-1',
          title: 'Default',
          position: 1024,
          color: null,
          isDefault: true,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      labels: [
        { id: 'lbl-1', boardId: 'board-1', name: 'Bug', color: '#FF0000', createdAt: new Date() },
      ],
      cards: [
        {
          id: 'card-1',
          boardId: 'board-1',
          columnId: 'col-1',
          swimlaneId: null,
          cardNumber: 1,
          title: 'Test Card',
          description: null,
          priority: Priority.MEDIUM,
          position: 1024,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignees: [],
          labels: [],
          checklists: [],
          tags: [],
        },
      ],
    };

    it('should export board with all entities', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoardWithDetails);

      const result = await service.exportToJson('board-1');

      expect(result.exportVersion).toBe(1);
      expect(result.exportedAt).toBeTruthy();
      expect(result.board.title).toBe('Sprint Board');
      expect(result.board.columns).toHaveLength(1);
      expect(result.board.cards).toHaveLength(1);
      expect(result.board.labels).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.exportToJson('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('importFromJson', () => {
    const validImportData = {
      exportVersion: 1,
      board: {
        title: 'Imported Board',
        description: 'Imported',
        visibility: Visibility.PRIVATE,
        columns: [
          {
            id: 'col-old-1',
            title: 'To Do',
            columnType: ColumnType.TODO,
            position: 1024,
            wipLimit: null,
            color: null,
          },
        ],
        swimlanes: [
          {
            id: 'sw-old-1',
            title: 'Default',
            position: 1024,
            color: null,
            isDefault: true,
          },
        ],
        labels: [
          { id: 'lbl-old-1', name: 'Bug', color: '#FF0000' },
        ],
        cards: [
          {
            id: 'card-old-1',
            columnId: 'col-old-1',
            swimlaneId: null,
            title: 'Test Card',
            description: null,
            priority: Priority.MEDIUM,
            position: 1024,
            labels: [],
            tags: [],
            checklists: [],
          },
        ],
      },
    };

    it('should import board and recreate entities', async () => {
      const newBoard = { ...mockBoard, id: 'board-new', title: 'Imported Board' };
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.board.findFirst.mockResolvedValue({ position: 1024 });
      prisma.board.create.mockResolvedValue(newBoard);
      prisma.boardMember.create.mockResolvedValue({});
      prisma.column.create.mockResolvedValue({ id: 'col-new-1' });
      prisma.swimlane.create.mockResolvedValue({ id: 'sw-new-1' });
      prisma.label.create.mockResolvedValue({ id: 'lbl-new-1' });
      prisma.card.create.mockResolvedValue({ id: 'card-new-1' });

      const result = await service.importFromJson('ws-1', 'user-1', validImportData);

      expect(result.id).toBe('board-new');
      expect(prisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-1',
            title: 'Imported Board',
            createdById: 'user-1',
          }),
        }),
      );
      expect(prisma.column.create).toHaveBeenCalled();
      expect(prisma.swimlane.create).toHaveBeenCalled();
      expect(prisma.label.create).toHaveBeenCalled();
      expect(prisma.card.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing board field', async () => {
      await expect(
        service.importFromJson('ws-1', 'user-1', { exportVersion: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.importFromJson('non-existent', 'user-1', validImportData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip cards with unknown column ids', async () => {
      const dataWithBadColumnRef = {
        ...validImportData,
        board: {
          ...validImportData.board,
          cards: [
            { id: 'card-old-1', columnId: 'unknown-col', title: 'Bad Card', labels: [], tags: [], checklists: [] },
          ],
        },
      };

      const newBoard = { ...mockBoard, id: 'board-new', title: 'Imported Board' };
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.board.findFirst.mockResolvedValue(null);
      prisma.board.create.mockResolvedValue(newBoard);
      prisma.boardMember.create.mockResolvedValue({});
      prisma.column.create.mockResolvedValue({ id: 'col-new-1' });
      prisma.swimlane.create.mockResolvedValue({ id: 'sw-new-1' });
      prisma.label.create.mockResolvedValue({ id: 'lbl-new-1' });

      await service.importFromJson('ws-1', 'user-1', dataWithBadColumnRef);

      // card.create should NOT have been called because column mapping failed
      expect(prisma.card.create).not.toHaveBeenCalled();
    });
  });
});
