import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/minio/minio.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async upload(
    cardId: string,
    userId: string,
    file: {
      originalname: string;
      buffer: Buffer;
      size: number;
      mimetype: string;
    },
  ) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');

    const ext = file.originalname.split('.').pop() ?? '';
    const objectName = `attachments/${cardId}/${randomUUID()}.${ext}`;

    await this.minioService.upload(objectName, file.buffer, file.size, file.mimetype);

    this.logger.log(`Uploaded attachment for card ${cardId}: ${objectName}`);

    return this.prisma.attachment.create({
      data: {
        cardId,
        uploadedById: userId,
        fileName: file.originalname,
        fileUrl: objectName,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async findByCardId(cardId: string) {
    return this.prisma.attachment.findMany({
      where: { cardId },
      include: {
        uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.minioService.delete(attachment.fileUrl);
    await this.prisma.attachment.delete({ where: { id } });
    this.logger.log(`Deleted attachment ${id} by user ${userId}`);
  }

  async getPresignedUrl(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const url = await this.minioService.getPresignedUrl(attachment.fileUrl);
    return { url, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async getCardId(attachmentId: string): Promise<string | null> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { cardId: true },
    });
    return attachment?.cardId ?? null;
  }
}
