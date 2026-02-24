import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: Record<string, any>;

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    description: 'A test workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    role: Role.OWNER,
    joinedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      workspace: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  describe('create', () => {
    it('should create workspace and add creator as OWNER', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      prisma.workspace.create.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.create.mockResolvedValue(mockMember);

      const result = await service.create('user-1', {
        name: 'Test Workspace',
        description: 'A test workspace',
      });

      expect(result).toEqual(mockWorkspace);
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Workspace',
          slug: 'test-workspace',
          ownerId: 'user-1',
        }),
      });
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'user-1',
          role: Role.OWNER,
        }),
      });
    });

    it('should handle slug collision by appending suffix', async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce({ id: 'ws-other', slug: 'test-workspace' })
        .mockResolvedValueOnce(null);
      prisma.workspace.create.mockResolvedValue({
        ...mockWorkspace,
        slug: 'test-workspace-1',
      });
      prisma.workspaceMember.create.mockResolvedValue(mockMember);

      const result = await service.create('user-1', { name: 'Test Workspace' });

      expect(result.slug).toBe('test-workspace-1');
    });
  });

  describe('findAllByUserId', () => {
    it('should return list of workspaces with member count and role', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        {
          role: Role.OWNER,
          workspace: {
            ...mockWorkspace,
            _count: { members: 3 },
          },
        },
      ]);

      const result = await service.findAllByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].memberCount).toBe(3);
      expect(result[0].myRole).toBe(Role.OWNER);
    });
  });

  describe('findById', () => {
    it('should return workspace with members', async () => {
      const workspaceWithMembers = {
        ...mockWorkspace,
        members: [
          {
            ...mockMember,
            user: { id: 'user-1', email: 'test@example.com', name: 'Test', avatarUrl: null },
          },
        ],
      };
      prisma.workspace.findUnique.mockResolvedValue(workspaceWithMembers);

      const result = await service.findById('ws-1');

      expect(result.id).toBe('ws-1');
      expect(result.members).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update workspace fields', async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce(mockWorkspace)
        .mockResolvedValueOnce(null);
      prisma.workspace.update.mockResolvedValue({
        ...mockWorkspace,
        name: 'Updated Name',
        slug: 'updated-name',
      });

      const result = await service.update('ws-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: expect.objectContaining({ name: 'Updated Name', slug: 'updated-name' }),
      });
    });

    it('should regenerate slug when name changes', async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce(mockWorkspace)
        .mockResolvedValueOnce({ id: 'ws-1', slug: 'new-name' });
      prisma.workspace.update.mockResolvedValue({
        ...mockWorkspace,
        name: 'New Name',
        slug: 'new-name',
      });

      await service.update('ws-1', { name: 'New Name' });

      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: expect.objectContaining({ slug: 'new-name' }),
      });
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspace.delete.mockResolvedValue(mockWorkspace);

      await service.delete('ws-1');

      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a new member', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.workspaceMember.create.mockResolvedValue({
        id: 'member-2',
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.MEMBER,
        joinedAt: new Date(),
        user: { id: 'user-2', email: 'u2@test.com', name: 'User 2', avatarUrl: null },
      });

      const result = await service.addMember('ws-1', 'user-2', Role.MEMBER);

      expect(result.userId).toBe('user-2');
      expect(result.role).toBe(Role.MEMBER);
    });

    it('should throw ConflictException for duplicate member', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findUnique.mockResolvedValue(mockMember);

      await expect(
        service.addMember('ws-1', 'user-1', Role.MEMBER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('non-existent', 'user-2', Role.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('ws-1', 'non-existent', Role.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const memberRecord = { ...mockMember, role: Role.MEMBER, userId: 'user-2' };
      prisma.workspaceMember.findUnique.mockResolvedValue(memberRecord);
      prisma.workspaceMember.update.mockResolvedValue({
        ...memberRecord,
        role: Role.ADMIN,
        user: { id: 'user-2', email: 'u2@test.com', name: 'User 2', avatarUrl: null },
      });

      const result = await service.updateMemberRole('ws-1', 'user-2', Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should throw ForbiddenException when changing OWNER role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(mockMember);

      await expect(
        service.updateMemberRole('ws-1', 'user-1', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('ws-1', 'non-existent', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      const memberRecord = { ...mockMember, role: Role.MEMBER, userId: 'user-2' };
      prisma.workspaceMember.findUnique.mockResolvedValue(memberRecord);
      prisma.workspaceMember.delete.mockResolvedValue(memberRecord);

      await service.removeMember('ws-1', 'user-2');

      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: { id: memberRecord.id },
      });
    });

    it('should throw ForbiddenException when removing OWNER', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(mockMember);

      await expect(service.removeMember('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('ws-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMemberRole', () => {
    it('should return role for existing member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(mockMember);

      const role = await service.getMemberRole('ws-1', 'user-1');

      expect(role).toBe(Role.OWNER);
    });

    it('should return null for non-member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      const role = await service.getMemberRole('ws-1', 'non-existent');

      expect(role).toBeNull();
    });
  });
});
