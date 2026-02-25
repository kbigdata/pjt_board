import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ActivityAction, NotificationType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationService, CardLike, TriggerType } from '../automation/automation.service';
import { ReportService } from '../report/report.service';

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

  /** boardId → Set of userId (online users per board) */
  private boardUsers: Map<string, Set<string>> = new Map();

  /** cardId → userId (who is currently editing the card) */
  private cardEditors: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AutomationService))
    private readonly automationService: AutomationService,
    private readonly reportService: ReportService,
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

    if (!client.userId) return;

    // Remove user from all board presence maps and clean up card editing locks
    for (const [boardId, users] of this.boardUsers.entries()) {
      if (users.has(client.userId)) {
        users.delete(client.userId);
        if (users.size === 0) {
          this.boardUsers.delete(boardId);
        }
        this.emitPresenceUpdate(boardId);
      }
    }

    // Remove any card editing locks held by this user
    for (const [cardId, editorId] of this.cardEditors.entries()) {
      if (editorId === client.userId) {
        this.cardEditors.delete(cardId);
        // We don't know which board this card belongs to here, so we broadcast
        // to all rooms the client was in
        client.rooms.forEach((room) => {
          if (room.startsWith('board:')) {
            const boardId = room.replace('board:', '');
            this.server.to(room).emit('cardEditingStopped', { cardId });
            this.emitPresenceUpdate(boardId);
          }
        });
      }
    }
  }

  @SubscribeMessage('joinBoard')
  handleJoinBoard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string },
  ) {
    const { boardId } = data;
    client.join(`board:${boardId}`);
    client.to(`board:${boardId}`).emit('userJoined', { userId: client.userId });
    this.logger.log(`User ${client.userId} joined board ${boardId}`);

    if (client.userId) {
      if (!this.boardUsers.has(boardId)) {
        this.boardUsers.set(boardId, new Set());
      }
      this.boardUsers.get(boardId)!.add(client.userId);
      this.emitPresenceUpdate(boardId);
    }
  }

  @SubscribeMessage('leaveBoard')
  handleLeaveBoard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string },
  ) {
    const { boardId } = data;
    client.leave(`board:${boardId}`);
    client.to(`board:${boardId}`).emit('userLeft', { userId: client.userId });

    if (client.userId) {
      const users = this.boardUsers.get(boardId);
      if (users) {
        users.delete(client.userId);
        if (users.size === 0) {
          this.boardUsers.delete(boardId);
        }
      }

      // Clean up card editing locks for this user on this board
      for (const [cardId, editorId] of this.cardEditors.entries()) {
        if (editorId === client.userId) {
          this.cardEditors.delete(cardId);
          this.server.to(`board:${boardId}`).emit('cardEditingStopped', { cardId });
        }
      }

      this.emitPresenceUpdate(boardId);
    }
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

  @SubscribeMessage('startEditingCard')
  handleStartEditingCard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string; cardId: string },
  ) {
    const { boardId, cardId } = data;
    if (client.userId) {
      this.cardEditors.set(cardId, client.userId);
      this.server.to(`board:${boardId}`).emit('cardEditingStarted', {
        cardId,
        userId: client.userId,
      });
    }
  }

  @SubscribeMessage('stopEditingCard')
  handleStopEditingCard(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string; cardId: string },
  ) {
    const { boardId, cardId } = data;
    if (client.userId && this.cardEditors.get(cardId) === client.userId) {
      this.cardEditors.delete(cardId);
      this.server.to(`board:${boardId}`).emit('cardEditingStopped', { cardId });
    }
  }

  @SubscribeMessage('getPresence')
  handleGetPresence(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { boardId: string },
  ) {
    const { boardId } = data;
    const onlineUsers = this.getOnlineUsers(boardId);
    client.emit('presenceUpdate', { boardId, userIds: onlineUsers });
  }

  // --- Presence helpers ---

  getOnlineUsers(boardId: string): string[] {
    return Array.from(this.boardUsers.get(boardId) ?? []);
  }

  emitPresenceUpdate(boardId: string): void {
    const userIds = this.getOnlineUsers(boardId);
    this.server.to(`board:${boardId}`).emit('presenceUpdate', { boardId, userIds });
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

  // --- Automation trigger helper ---

  async triggerAutomation(
    boardId: string,
    triggerType: TriggerType,
    card: CardLike,
  ): Promise<void> {
    try {
      await this.automationService.triggerRules(boardId, triggerType, card);
    } catch (err) {
      this.logger.error(
        `Error triggering automation rules for board "${boardId}": ${(err as Error).message}`,
      );
    }
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
    await this.triggerAutomation(boardId, 'cardCreated', card as unknown as CardLike);
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

    await this.triggerAutomation(boardId, 'cardMoved', card as unknown as CardLike);

    // Log card status transition for analytics
    try {
      await this.reportService.logCardMove(
        card.id as string,
        boardId,
        fromColumnId,
        card.columnId as string,
      );
    } catch (err) {
      this.logger.warn(`Failed to log card move for analytics: ${(err as Error).message}`);
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

  emitAttachmentAdded(boardId: string, attachment: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('attachmentAdded', attachment);
  }

  emitAttachmentRemoved(boardId: string, attachmentId: string) {
    this.server.to(`board:${boardId}`).emit('attachmentRemoved', { id: attachmentId });
  }

  emitSwimlaneCreated(boardId: string, swimlane: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('swimlaneCreated', swimlane);
  }

  emitSwimlaneUpdated(boardId: string, swimlane: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('swimlaneUpdated', swimlane);
  }

  emitSwimlaneMoved(boardId: string, swimlane: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('swimlaneMoved', swimlane);
  }

  emitReplyAdded(boardId: string, reply: Record<string, unknown>) {
    this.server.to(`board:${boardId}`).emit('replyAdded', reply);
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
