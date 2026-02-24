import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AttachmentService } from './attachment.service';
import { BoardService } from '../board/board.service';
import { CardService } from '../card/card.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BoardGateway } from '../board/board.gateway';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly boardService: BoardService,
    private readonly cardService: CardService,
    private readonly boardGateway: BoardGateway,
  ) {}

  @Post('cards/:cardId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to a card' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async upload(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds maximum size of 10MB');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    const boardId = await this.requireAttachmentCardAccess(cardId, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);

    const attachment = await this.attachmentService.upload(cardId, user.id, {
      originalname: file.originalname,
      buffer: file.buffer,
      size: file.size,
      mimetype: file.mimetype,
    });

    this.boardGateway.emitAttachmentAdded(
      boardId,
      attachment as unknown as Record<string, unknown>,
    );

    return attachment;
  }

  @Get('cards/:cardId/attachments')
  @ApiOperation({ summary: 'List attachments for a card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findByCard(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.attachmentService.findByCardId(cardId);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const boardId = await this.requireAttachmentBoardRole(id, user.id, [
      Role.OWNER,
      Role.ADMIN,
      Role.MEMBER,
    ]);

    await this.attachmentService.delete(id, user.id);

    this.boardGateway.emitAttachmentRemoved(boardId, id);

    return { message: 'Attachment deleted successfully' };
  }

  @Get('attachments/:id/download')
  @ApiOperation({ summary: 'Get presigned download URL for an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Presigned download URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async download(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.requireAttachmentBoardAccess(id, user.id);
    return this.attachmentService.getPresignedUrl(id);
  }

  // ── Helpers ──

  private async requireBoardMembership(boardId: string, userId: string) {
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this board');
    }
    return role;
  }

  private async requireBoardRole(boardId: string, userId: string, allowed: Role[]) {
    const role = await this.requireBoardMembership(boardId, userId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return role;
  }

  private async requireCardBoardAccess(cardId: string, userId: string) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    return this.requireBoardMembership(boardId, userId);
  }

  private async requireAttachmentCardAccess(
    cardId: string,
    userId: string,
    allowed: Role[],
  ): Promise<string> {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    await this.requireBoardRole(boardId, userId, allowed);
    return boardId;
  }

  private async requireAttachmentBoardAccess(attachmentId: string, userId: string) {
    const cardId = await this.attachmentService.getCardId(attachmentId);
    if (!cardId) throw new ForbiddenException('Attachment not found');
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Attachment not found');
    return this.requireBoardMembership(boardId, userId);
  }

  private async requireAttachmentBoardRole(
    attachmentId: string,
    userId: string,
    allowed: Role[],
  ): Promise<string> {
    const cardId = await this.attachmentService.getCardId(attachmentId);
    if (!cardId) throw new ForbiddenException('Attachment not found');
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Attachment not found');
    await this.requireBoardRole(boardId, userId, allowed);
    return boardId;
  }
}
