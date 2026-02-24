import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CommentService } from './comment.service';
import { CardService } from '../card/card.service';
import { BoardService } from '../board/board.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly cardService: CardService,
    private readonly boardService: BoardService,
  ) {}

  @Post('cards/:cardId/comments')
  @ApiOperation({ summary: 'Add comment to card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
    @Body() dto: CreateCommentDto,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.commentService.create(cardId, user.id, dto);
  }

  @Get('cards/:cardId/comments')
  @ApiOperation({ summary: 'List comments on card' })
  @ApiParam({ name: 'cardId', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a board member' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('cardId') cardId: string,
  ) {
    await this.requireCardBoardAccess(cardId, user.id);
    return this.commentService.findAllByCardId(cardId);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, user.id, dto);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.commentService.delete(id, user.id);
    return { message: 'Comment deleted successfully' };
  }

  private async requireCardBoardAccess(cardId: string, userId: string) {
    const boardId = await this.cardService.getBoardId(cardId);
    if (!boardId) throw new ForbiddenException('Card not found');
    const role = await this.boardService.getMemberRole(boardId, userId);
    if (!role) throw new ForbiddenException('You are not a member of this board');
    return role;
  }
}
