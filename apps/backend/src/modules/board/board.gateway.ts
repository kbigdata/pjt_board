import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ActivityAction } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BoardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly activityService: ActivityService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      this.logger.log(`Client connected: ${client.id} (user: ${client.userId})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBoard')
  handleJoinBoard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string },
  ) {
    client.join(`board:${data.boardId}`);
    client.to(`board:${data.boardId}`).emit('userJoined', {
      userId: client.userId,
    });
    this.logger.log(`User ${client.userId} joined board ${data.boardId}`);
  }

  @SubscribeMessage('leaveBoard')
  handleLeaveBoard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string },
  ) {
    client.leave(`board:${data.boardId}`);
    client.to(`board:${data.boardId}`).emit('userLeft', {
      userId: client.userId,
    });
  }

  // --- Broadcast helpers called from controllers/services ---

  async emitCardCreated(boardId: string, userId: string, card: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('cardCreated', card);
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.CREATED,
      cardId: card.id as string,
      details: { title: card.title },
    });
  }

  async emitCardUpdated(boardId: string, userId: string, card: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('cardUpdated', card);
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.UPDATED,
      cardId: card.id as string,
      details: { title: card.title },
    });
  }

  async emitCardMoved(
    boardId: string,
    userId: string,
    card: Record<string, unknown>,
    fromColumnId?: string,
  ) {
    this.server.to(`board:${boardId}`).emit('cardMoved', card);
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.MOVED,
      cardId: card.id as string,
      details: { fromColumnId, toColumnId: card.columnId },
    });
  }

  async emitCardArchived(boardId: string, userId: string, cardId: string) {
    this.server.to(`board:${boardId}`).emit('cardArchived', { id: cardId });
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.ARCHIVED,
      cardId,
    });
  }

  emitColumnCreated(boardId: string, column: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('columnCreated', column);
  }

  emitColumnUpdated(boardId: string, column: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('columnUpdated', column);
  }

  emitColumnMoved(boardId: string, column: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('columnMoved', column);
  }

  async emitCommentAdded(boardId: string, userId: string, cardId: string, comment: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('commentAdded', { cardId, comment });
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.COMMENTED,
      cardId,
    });
  }
}
