import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/minio/minio.service';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let prisma: Record<string, any>;
  let minio: Record<string, jest.Mock>;

  const mockCard = {
    id: 'card-1',
    boardId: 'board-1',
    title: 'Test Card',
  };

  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    avatarUrl: null,
  };

  const mockAttachment = {
    id: 'att-1',
    cardId: 'card-1',
    uploadedById: 'user-1',
    fileName: 'document.pdf',
    fileUrl: 'attachments/card-1/uuid.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    createdAt: new Date(),
    uploadedBy: mockUser,
  };

  const mockFile = {
    originalname: 'document.pdf',
    buffer: Buffer.from('file content'),
    size: 1024,
    mimetype: 'application/pdf',
  };

  beforeEach(async () => {
    prisma = {
      card: {
        findUnique: jest.fn(),
      },
      attachment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    minio = {
      upload: jest.fn().mockResolvedValue('attachments/card-1/uuid.pdf'),
      delete: jest.fn().mockResolvedValue(undefined),
      getPresignedUrl: jest.fn().mockResolvedValue('https://minio.example.com/presigned-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: MinioService, useValue: minio },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
  });

  describe('upload', () => {
    it('should upload file to MinIO and create attachment record', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.attachment.create.mockResolvedValue(mockAttachment);

      const result = await service.upload('card-1', 'user-1', mockFile);

      expect(minio.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^attachments\/card-1\/.+\.pdf$/),
        mockFile.buffer,
        mockFile.size,
        mockFile.mimetype,
      );
      expect(prisma.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cardId: 'card-1',
            uploadedById: 'user-1',
            fileName: 'document.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
          }),
        }),
      );
      expect(result).toEqual(mockAttachment);
    });

    it('should throw NotFoundException when card not found', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.upload('non-existent', 'user-1', mockFile)).rejects.toThrow(
        NotFoundException,
      );
      expect(minio.upload).not.toHaveBeenCalled();
    });

    it('should handle file with no dot in name, using whole name as extension', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.attachment.create.mockResolvedValue(mockAttachment);

      const fileNoExt = { ...mockFile, originalname: 'noextension' };
      await service.upload('card-1', 'user-1', fileNoExt);

      // When filename has no dot, split('.').pop() returns the full filename as extension
      expect(minio.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^attachments\/card-1\/.+\.noextension$/),
        expect.any(Buffer),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('findByCardId', () => {
    it('should return attachments ordered by createdAt desc', async () => {
      prisma.attachment.findMany.mockResolvedValue([mockAttachment]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(prisma.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cardId: 'card-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no attachments', async () => {
      prisma.attachment.findMany.mockResolvedValue([]);

      const result = await service.findByCardId('card-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete from MinIO and database', async () => {
      prisma.attachment.findUnique.mockResolvedValue(mockAttachment);
      prisma.attachment.delete.mockResolvedValue(mockAttachment);

      await service.delete('att-1', 'user-1');

      expect(minio.delete).toHaveBeenCalledWith(mockAttachment.fileUrl);
      expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
    });

    it('should throw NotFoundException when attachment not found', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
      expect(minio.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned URL with metadata', async () => {
      prisma.attachment.findUnique.mockResolvedValue(mockAttachment);

      const result = await service.getPresignedUrl('att-1');

      expect(minio.getPresignedUrl).toHaveBeenCalledWith(mockAttachment.fileUrl);
      expect(result).toEqual({
        url: 'https://minio.example.com/presigned-url',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
      });
    });

    it('should throw NotFoundException when attachment not found', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(service.getPresignedUrl('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCardId', () => {
    it('should return cardId for existing attachment', async () => {
      prisma.attachment.findUnique.mockResolvedValue({ cardId: 'card-1' });

      const result = await service.getCardId('att-1');

      expect(result).toBe('card-1');
    });

    it('should return null for non-existent attachment', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      const result = await service.getCardId('non-existent');

      expect(result).toBeNull();
    });
  });
});
