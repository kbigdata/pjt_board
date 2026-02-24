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
import { ActivityAction, NotificationType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';

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
  server!: Server;

  private readonly logger = new Logger(BoardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
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

  @SubscribeMessage('joinUser')
  handleJoinUser(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (client.userId && client.userId === data.userId) {
      client.join(`user:${data.userId}`);
      this.logger.log(`User ${client.userId} joined personal room`);
    }
  }

  // --- Notification helpers ---

  emitNotification(userId: string, notification: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  async emitCardAssigned(
    boardId: string,
    assignedById: string,
    assigneeId: string,
    card: Record<string, unknown>,
  ) {
    this.server.to(`board:${boardId}`).emit('cardUpdated', card);

    if (assigneeId !== assignedById) {
      const notification = await this.notificationService.create({
        userId: assigneeId,
        type: NotificationType.CARD_ASSIGNED,
        title: 'You were assigned to a card',
        message: `You were assigned to "${card.title as string}"`,
        link: `/boards/${boardId}`,
      });
      this.emitNotification(assigneeId, notification as unknown as Record<string, unknown>);
    }

    await this.activityService.log({
      boardId,
      userId: assignedById,
      action: ActivityAction.ASSIGNED,
      cardId: card.id as string,
      details: { assigneeId, title: card.title },
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

    // Notify card assignees (excluding the user who moved the card)
    const assignees = await this.prisma.cardAssignee.findMany({
      where: { cardId: card.id as string },
      select: { userId: true },
    });
    const assigneeIds = assignees
      .map((a) => a.userId)
      .filter((id) => id !== userId);

    if (assigneeIds.length > 0) {
      await this.notificationService.createForMany({
        userIds: assigneeIds,
        type: NotificationType.CARD_MOVED,
        title: 'A card was moved',
        message: `Card "${card.title as string}" was moved to a new column`,
        link: `/boards/${boardId}`,
      });
      for (const assigneeId of assigneeIds) {
        this.server.to(`user:${assigneeId}`).emit('notificationUnread', { boardId });
      }
    }
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

  async emitCommentAdded(
    boardId: string,
    userId: string,
    cardId: string,
    comment: Record<string, unknown>,
  ) {
    this.server.to(`board:${boardId}`).emit('commentAdded', { cardId, comment });
    await this.activityService.log({
      boardId,
      userId,
      action: ActivityAction.COMMENTED,
      cardId,
    });

    // Notify card assignees (excluding the commenter)
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { title: true, assignees: { select: { userId: true } } },
    });

    if (card) {
      const assigneeIds = card.assignees
        .map((a) => a.userId)
        .filter((id) => id !== userId);

      if (assigneeIds.length > 0) {
        await this.notificationService.createForMany({
          userIds: assigneeIds,
          type: NotificationType.CARD_COMMENTED,
          title: 'New comment on your card',
          message: `Someone commented on "${card.title}"`,
          link: `/boards/${boardId}`,
        });
        for (const assigneeId of assigneeIds) {
          this.server.to(`user:${assigneeId}`).emit('notificationUnread', { boardId });
        }
      }
    }
  }
}
