import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ColumnType, Role, Visibility } from '@prisma/client';
import { TemplateService } from './template.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: Record<string, any>;

  const mockBoard = {
    id: 'board-1',
    workspaceId: 'ws-1',
    title: 'Sprint Board',
    visibility: Visibility.PRIVATE,
    position: 1024,
    createdById: 'user-1',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    columns: [
      {
        title: 'To Do',
        columnType: ColumnType.TODO,
        position: 1024,
        wipLimit: null,
        color: null,
      },
      {
        title: 'In Progress',
        columnType: ColumnType.IN_PROGRESS,
        position: 2048,
        wipLimit: 3,
        color: '#FF0000',
      },
    ],
    swimlanes: [
      {
        title: 'Default',
        position: 1024,
        color: null,
        isDefault: true,
      },
    ],
    labels: [
      { name: 'Bug', color: '#FF0000' },
      { name: 'Feature', color: '#00FF00' },
    ],
  };

  const mockTemplate = {
    id: 'tpl-1',
    name: 'Sprint Template',
    description: 'Standard sprint board template',
    templateData: {
      columns: mockBoard.columns,
      swimlanes: mockBoard.swimlanes,
      labels: mockBoard.labels,
    },
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: 'user-1', name: 'User', avatarUrl: null },
  };

  beforeEach(async () => {
    prisma = {
      board: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      boardTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn(),
      },
      boardMember: {
        create: jest.fn(),
      },
      column: {
        createMany: jest.fn(),
      },
      swimlane: {
        createMany: jest.fn(),
      },
      label: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  describe('createFromBoard', () => {
    it('should create a template with board structure snapshot', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.createFromBoard(
        'board-1',
        'user-1',
        'Sprint Template',
        'Standard sprint board template',
      );

      expect(result.name).toBe('Sprint Template');
      expect(prisma.boardTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Sprint Template',
            description: 'Standard sprint board template',
            createdById: 'user-1',
            templateData: expect.objectContaining({
              columns: expect.any(Array),
              swimlanes: expect.any(Array),
              labels: expect.any(Array),
            }),
          }),
        }),
      );
    });

    it('should snapshot columns with all fields', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardTemplate.create.mockResolvedValue(mockTemplate);

      await service.createFromBoard('board-1', 'user-1', 'Template');

      const callArgs = prisma.boardTemplate.create.mock.calls[0][0];
      const templateData = callArgs.data.templateData;

      expect(templateData.columns).toHaveLength(2);
      expect(templateData.columns[0]).toMatchObject({
        title: 'To Do',
        columnType: ColumnType.TODO,
        position: 1024,
      });
      expect(templateData.columns[1]).toMatchObject({
        title: 'In Progress',
        wipLimit: 3,
        color: '#FF0000',
      });
    });

    it('should snapshot swimlanes and labels', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.boardTemplate.create.mockResolvedValue(mockTemplate);

      await service.createFromBoard('board-1', 'user-1', 'Template');

      const callArgs = prisma.boardTemplate.create.mock.calls[0][0];
      const templateData = callArgs.data.templateData;

      expect(templateData.swimlanes).toHaveLength(1);
      expect(templateData.swimlanes[0].isDefault).toBe(true);
      expect(templateData.labels).toHaveLength(2);
      expect(templateData.labels[0]).toMatchObject({ name: 'Bug', color: '#FF0000' });
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromBoard('non-existent', 'user-1', 'Template'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      prisma.boardTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.boardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findById', () => {
    it('should return template', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findById('tpl-1');

      expect(result.id).toBe('tpl-1');
    });

    it('should throw NotFoundException for non-existent template', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyTemplate', () => {
    it('should create a new board with columns, swimlanes, and labels from template', async () => {
      const newBoard = {
        id: 'board-2',
        workspaceId: 'ws-1',
        title: 'New Board',
        visibility: Visibility.PRIVATE,
        position: 2048,
        createdById: 'user-1',
      };

      prisma.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1', name: 'Workspace' });
      prisma.board.findFirst.mockResolvedValue({ position: 1024 });
      prisma.board.create.mockResolvedValue(newBoard);
      prisma.boardMember.create.mockResolvedValue({});
      prisma.column.createMany.mockResolvedValue({ count: 2 });
      prisma.swimlane.createMany.mockResolvedValue({ count: 1 });
      prisma.label.createMany.mockResolvedValue({ count: 2 });

      const result = await service.applyTemplate('tpl-1', 'ws-1', 'user-1', 'New Board');

      expect(result.id).toBe('board-2');
      expect(prisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-1',
            title: 'New Board',
            createdById: 'user-1',
            position: 2048,
          }),
        }),
      );
      expect(prisma.boardMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.OWNER }),
        }),
      );
      expect(prisma.column.createMany).toHaveBeenCalled();
      expect(prisma.swimlane.createMany).toHaveBeenCalled();
      expect(prisma.label.createMany).toHaveBeenCalled();
    });

    it('should position new board after last board', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.board.findFirst.mockResolvedValue({ position: 3072 });
      prisma.board.create.mockResolvedValue({ id: 'board-2', position: 4096 });
      prisma.boardMember.create.mockResolvedValue({});
      prisma.column.createMany.mockResolvedValue({ count: 0 });
      prisma.swimlane.createMany.mockResolvedValue({ count: 0 });
      prisma.label.createMany.mockResolvedValue({ count: 0 });

      await service.applyTemplate('tpl-1', 'ws-1', 'user-1', 'New Board');

      expect(prisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 4096 }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent template', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.applyTemplate('non-existent', 'ws-1', 'user-1', 'New Board'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.applyTemplate('tpl-1', 'non-existent', 'user-1', 'New Board'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete template', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.boardTemplate.delete.mockResolvedValue(mockTemplate);

      await service.delete('tpl-1');

      expect(prisma.boardTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl-1' } });
    });

    it('should throw NotFoundException for non-existent template', async () => {
      prisma.boardTemplate.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
