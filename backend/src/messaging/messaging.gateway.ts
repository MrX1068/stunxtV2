import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MessageService } from './message.service';
import { ConversationService } from './conversation.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

interface JoinRoomData {
  conversationId: string;
}

interface OnlineUserData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Configure for your frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private userRooms = new Map<string, Set<string>>(); // socketId -> Set of conversationIds
  private typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds

  constructor(
    private jwtService: JwtService,
    private messageService: MessageService,
    private conversationService: ConversationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.user = payload;

      // Track connected user
      if (!this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, new Set());
      }
      this.connectedUsers.get(client.userId).add(client.id);

      // Initialize user rooms
      this.userRooms.set(client.id, new Set());

      // Update user online status
      await this.updateUserOnlineStatus(client.userId, 'online');

      // Auto-join user's conversations
      await this.autoJoinUserConversations(client);

      this.logger.log(`User ${client.userId} connected with socket ${client.id}`);

      // Emit online status to contacts
      this.emitUserOnlineStatus(client.userId, 'online');

    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove socket from user's connections
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          // User is completely offline
          await this.updateUserOnlineStatus(client.userId, 'offline');
          this.emitUserOnlineStatus(client.userId, 'offline');
        }
      }

      // Clean up typing indicators
      this.cleanupUserTyping(client.userId);

      // Clean up room tracking
      this.userRooms.delete(client.id);

      this.logger.log(`User ${client.userId} disconnected from socket ${client.id}`);
    }
  }

  // ==================== Message Handlers ====================

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
  ) {
    try {
      const { conversationId } = data;
      
      // Verify user has access to conversation
      const hasAccess = await this.conversationService.hasUserAccess(conversationId, client.userId);
      if (!hasAccess) {
        client.emit('error', { message: 'Access denied to conversation' });
        return;
      }

      // Join socket room
      await client.join(conversationId);
      
      // Track room membership
      this.userRooms.get(client.id)?.add(conversationId);

      // Mark user as active in conversation
      await this.updateUserConversationActivity(client.userId, conversationId);

      client.emit('joined_conversation', { conversationId });
      this.logger.log(`User ${client.userId} joined conversation ${conversationId}`);

    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
      this.logger.error(`Join conversation error: ${error.message}`);
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
  ) {
    const { conversationId } = data;
    
    // Leave socket room
    await client.leave(conversationId);
    
    // Update room tracking
    this.userRooms.get(client.id)?.delete(conversationId);

    // Stop typing if user was typing
    this.stopUserTyping(conversationId, client.userId);

    client.emit('left_conversation', { conversationId });
    this.logger.log(`User ${client.userId} left conversation ${conversationId}`);
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingData,
  ) {
    const { conversationId } = data;

    // Add user to typing set
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(client.userId);

    // Broadcast to other users in conversation (exclude sender)
    client.to(conversationId).emit('user_typing', {
      conversationId,
      userId: client.userId,
      isTyping: true,
      timestamp: new Date(),
    });

    // Auto-stop typing after 5 seconds
    setTimeout(() => {
      this.stopUserTyping(conversationId, client.userId);
    }, 5000);
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingData,
  ) {
    const { conversationId } = data;
    this.stopUserTyping(conversationId, client.userId);
  }

  @SubscribeMessage('mark_messages_read')
  async handleMarkMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    try {
      const result = await this.messageService.markAsRead(
        data.conversationId,
        client.userId,
        data.messageId
      );

      // Emit read receipt to conversation
      this.server.to(data.conversationId).emit('messages_read', {
        conversationId: data.conversationId,
        userId: client.userId,
        messageId: data.messageId,
        readAt: new Date(),
      });

      client.emit('messages_marked_read', { success: true, unreadCount: result.unreadCount });

    } catch (error) {
      client.emit('error', { message: 'Failed to mark messages as read' });
      this.logger.error(`Mark read error: ${error.message}`);
    }
  }

  @SubscribeMessage('request_online_users')
  async handleRequestOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const onlineUsers = await this.getConversationOnlineUsers(data.conversationId);
      client.emit('online_users', {
        conversationId: data.conversationId,
        users: onlineUsers,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to get online users' });
    }
  }

  // ==================== Event Listeners ====================

  @OnEvent('message.sent')
  async handleMessageSent(payload: any) {
    const { message, conversationId, participants, isOptimistic } = payload;

    // Emit to all conversation participants
    this.server.to(conversationId).emit('new_message', {
      message,
      isOptimistic,
      timestamp: new Date(),
    });

    // Send push notifications to offline users
    if (!isOptimistic) {
      await this.sendPushNotifications(message, participants);
    }
  }

  @OnEvent('message.confirmed')
  async handleMessageConfirmed(payload: any) {
    const { optimisticId, persistedMessage, conversationId } = payload;

    // Update optimistic message with real data
    this.server.to(conversationId).emit('message_confirmed', {
      optimisticId,
      message: persistedMessage,
      timestamp: new Date(),
    });
  }

  @OnEvent('message.failed')
  async handleMessageFailed(payload: any) {
    const { optimisticId, error, conversationId, senderId } = payload;

    // Notify sender about failure
    const userSockets = this.connectedUsers.get(senderId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit('message_failed', {
          optimisticId,
          error,
          timestamp: new Date(),
        });
      });
    }
  }

  @OnEvent('message.read')
  async handleMessageRead(payload: any) {
    const { conversationId, userId, messageId, readAt } = payload;

    // Emit read receipt to conversation
    this.server.to(conversationId).emit('message_read_receipt', {
      conversationId,
      userId,
      messageId,
      readAt,
    });
  }

  @OnEvent('message.reaction.added')
  async handleReactionAdded(payload: any) {
    const { messageId, userId, emoji, timestamp } = payload;

    // Find message's conversation and emit to participants
    const message = await this.messageService.getMessageById(messageId);
    if (message) {
      this.server.to(message.conversationId).emit('reaction_added', {
        messageId,
        userId,
        emoji,
        timestamp,
      });
    }
  }

  @OnEvent('message.reaction.removed')
  async handleReactionRemoved(payload: any) {
    const { messageId, userId, emoji, timestamp } = payload;

    // Find message's conversation and emit to participants
    const message = await this.messageService.getMessageById(messageId);
    if (message) {
      this.server.to(message.conversationId).emit('reaction_removed', {
        messageId,
        userId,
        emoji,
        timestamp,
      });
    }
  }

  @OnEvent('conversation.created')
  async handleConversationCreated(payload: any) {
    const { conversation, participants } = payload;

    // Auto-join all participants to the conversation room
    for (const participant of participants) {
      const userSockets = this.connectedUsers.get(participant.userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.server.sockets.sockets.get(socketId)?.join(conversation.id);
        });
      }
    }

    // Emit conversation created event
    this.server.to(conversation.id).emit('conversation_created', {
      conversation,
      timestamp: new Date(),
    });
  }

  @OnEvent('conversation.updated')
  async handleConversationUpdated(payload: any) {
    const { conversation, updatedFields } = payload;

    this.server.to(conversation.id).emit('conversation_updated', {
      conversationId: conversation.id,
      updates: updatedFields,
      timestamp: new Date(),
    });
  }

  @OnEvent('participant.added')
  async handleParticipantAdded(payload: any) {
    const { conversationId, participant } = payload;

    // Auto-join new participant to conversation room
    const userSockets = this.connectedUsers.get(participant.userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.sockets.sockets.get(socketId)?.join(conversationId);
      });
    }

    this.server.to(conversationId).emit('participant_added', {
      conversationId,
      participant,
      timestamp: new Date(),
    });
  }

  @OnEvent('participant.removed')
  async handleParticipantRemoved(payload: any) {
    const { conversationId, participant } = payload;

    // Remove participant from conversation room
    const userSockets = this.connectedUsers.get(participant.userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.sockets.sockets.get(socketId)?.leave(conversationId);
      });
    }

    this.server.to(conversationId).emit('participant_removed', {
      conversationId,
      participant,
      timestamp: new Date(),
    });
  }

  // ==================== Helper Methods ====================

  private stopUserTyping(conversationId: string, userId: string) {
    const typingSet = this.typingUsers.get(conversationId);
    if (typingSet && typingSet.has(userId)) {
      typingSet.delete(userId);
      
      // Broadcast typing stopped
      this.server.to(conversationId).emit('user_typing', {
        conversationId,
        userId,
        isTyping: false,
        timestamp: new Date(),
      });

      // Clean up empty sets
      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  private cleanupUserTyping(userId: string) {
    // Remove user from all typing indicators
    for (const [conversationId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(userId)) {
        this.stopUserTyping(conversationId, userId);
      }
    }
  }

  private async autoJoinUserConversations(client: AuthenticatedSocket) {
    try {
      // Get user's active conversations
      const conversations = await this.conversationService.getUserConversations(client.userId);
      
      for (const conversation of conversations) {
        await client.join(conversation.id);
        this.userRooms.get(client.id)?.add(conversation.id);
      }

      this.logger.log(`User ${client.userId} auto-joined ${conversations.length} conversations`);
    } catch (error) {
      this.logger.error(`Auto-join conversations error: ${error.message}`);
    }
  }

  private async updateUserOnlineStatus(userId: string, status: 'online' | 'offline') {
    const cacheKey = `user_status:${userId}`;
    const statusData: OnlineUserData = {
      userId,
      status,
      lastSeen: new Date(),
    };

    await this.cacheManager.set(cacheKey, statusData, 300000); // 5 minutes
  }

  private async updateUserConversationActivity(userId: string, conversationId: string) {
    // Update participant's last seen timestamp
    const cacheKey = `participant:${conversationId}:${userId}`;
    await this.cacheManager.del(cacheKey); // Force refresh from DB
  }

  private emitUserOnlineStatus(userId: string, status: 'online' | 'offline') {
    // Emit to user's contacts/conversations
    // This would need integration with contacts/friends system
    this.server.emit('user_status_changed', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  private async getConversationOnlineUsers(conversationId: string): Promise<OnlineUserData[]> {
    const participants = await this.conversationService.getConversationParticipants(conversationId);
    const onlineUsers: OnlineUserData[] = [];

    for (const participant of participants) {
      const cacheKey = `user_status:${participant.userId}`;
      const status = await this.cacheManager.get<OnlineUserData>(cacheKey);
      
      if (status && status.status === 'online') {
        onlineUsers.push(status);
      }
    }

    return onlineUsers;
  }

  private async sendPushNotifications(message: any, participants: string[]) {
    // Integration with push notification service
    // This would send notifications to offline users
    this.logger.log(`Sending push notifications for message ${message.id} to ${participants.length} participants`);
  }

  // ==================== Public Methods for External Use ====================

  public async notifyConversationUpdate(conversationId: string, updates: any) {
    this.server.to(conversationId).emit('conversation_updated', {
      conversationId,
      updates,
      timestamp: new Date(),
    });
  }

  public async notifyUserMention(userId: string, messageId: string, conversationId: string) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit('mentioned', {
          messageId,
          conversationId,
          timestamp: new Date(),
        });
      });
    }
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getConversationOnlineCount(conversationId: string): number {
    const room = this.server.sockets.adapter.rooms.get(conversationId);
    return room ? room.size : 0;
  }
}
