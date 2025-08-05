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
import { MessageType } from '../shared/entities/message.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
    origin: true, // Allow all origins for development
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
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized on /messaging namespace');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    const connectionStart = Date.now();


    try {
      // Extract token from handshake (optimized)
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      // Fast JWT token verification with caching

      const tokenCacheKey = `jwt_verification:${token.slice(-10)}`;
      let payload = await this.cacheManager.get<any>(tokenCacheKey);
      
      if (!payload) {
        payload = await this.jwtService.verifyAsync(token);
        // Cache the verified payload for 5 minutes to speed up subsequent connections
        await this.cacheManager.set(tokenCacheKey, payload, 300000);
      }
      

      
      client.userId = payload.sub;
      client.user = payload;

      // Track connected user (optimized)
      if (!this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, new Set());
      }
      this.connectedUsers.get(client.userId).add(client.id);

      // Initialize user rooms
      this.userRooms.set(client.id, new Set());

      // Parallel execution of status updates and room joining for faster connection
      const connectionPromises = [
        this.updateUserOnlineStatus(client.userId, 'online'),
        this.autoJoinUserConversations(client)
      ];

      await Promise.all(connectionPromises);

      const totalConnectionTime = Date.now() - connectionStart;
  

      // Emit connection success immediately to frontend
      client.emit('connection_success', {
        userId: client.userId,
        socketId: client.id,
        connectionTime: totalConnectionTime,
        timestamp: new Date().toISOString()
      });

      // Emit online status to contacts (non-blocking)
      setImmediate(() => this.emitUserOnlineStatus(client.userId, 'online'));

    } catch (error) {
      const connectionTime = Date.now() - connectionStart;
      client.emit('connection_error', { error: error.message, connectionTime });
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
      

      
      // Handle space conversations differently
      if (conversationId.startsWith('space-') || conversationId.startsWith('conv_')) {
        // For space conversations, just join the room without UUID validation
        await client.join(conversationId);
        
        // Track room membership
        this.userRooms.get(client.id)?.add(conversationId);

        client.emit('joined_conversation', { conversationId });
      
        return;
      }
      
      // For regular conversations, verify user has access
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

    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
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
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingData,
  ) {
    const { conversationId } = data;

    // ✅ CRITICAL FIX: Get user information for typing indicator
    const user = await this.getUserFromCache(client.userId);

    // Add user to typing set
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(client.userId);

    // Broadcast to other users in conversation (exclude sender) with user info
    client.to(conversationId).emit('user_typing', {
      conversationId,
      userId: client.userId,
      userName: user.username || user.fullName || 'User',
      isTyping: true,
      timestamp: new Date().toISOString(),
    });

    console.log(`👀 [Gateway] User ${user.username || client.userId} started typing in ${conversationId}`);

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
    console.log(`👀 [Gateway] User ${client.userId} stopped typing in ${conversationId}`);
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

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      conversationId: string;
      content: string;
      type?: string;
      optimisticId?: string;
      replyTo?: string;
      attachments?: any[];
    },
  ) {


    try {
      // Validate input data
      if (!data.conversationId || !data.content?.trim()) {
       
        client.emit('message_error', {
          optimisticId: data.optimisticId,
          error: 'Invalid message data: missing conversationId or content',
          success: false,
        });
        return;
      }

      // Check if conversation exists or is a space conversation
      const isSpaceConversation = data.conversationId.startsWith('space-');


      // Create the message DTO
      const messageDto = {
        conversationId: data.conversationId,
        content: data.content.trim(),
        type: (data.type as MessageType) || MessageType.TEXT,
        replyToId: data.replyTo,
        attachments: data.attachments || [],
      };



      // Send message through service with detailed logging
  
      const result = await this.messageService.sendMessage(
        client.userId,
        messageDto,
        data.optimisticId
      );

      // ✅ CRITICAL FIX: Enhance message with complete user data for frontend
      const enhancedMessage = await this.enhanceMessageWithUserData(result.message);

      // Emit immediate confirmation back to sender
      client.emit('message_sent', {
        optimisticId: data.optimisticId,
        message: enhancedMessage,
        success: true,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to conversation participants with enhanced message
      const roomName = `conversation:${data.conversationId}`;
      const broadcastData = {
        message: enhancedMessage,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      };

      client.to(roomName).emit('new_message', broadcastData);
   
      // Also emit the message.sent event for additional listeners
      this.eventEmitter.emit('message.sent', {
        message: result.message,
        conversationId: data.conversationId,
        senderId: client.userId,
        participants: result.participants,
        timestamp: new Date().toISOString(),
      });

  

    } catch (error) {



      // Emit error back to sender with detailed info
      client.emit('message_error', {
        optimisticId: data.optimisticId,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      });

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

  private async stopUserTyping(conversationId: string, userId: string) {
    const typingSet = this.typingUsers.get(conversationId);
    if (typingSet && typingSet.has(userId)) {
      typingSet.delete(userId);
      
      // ✅ CRITICAL FIX: Get user info and broadcast with complete data
      try {
        const user = await this.getUserFromCache(userId);
        
        // Broadcast typing stopped with user information
        this.server.to(conversationId).emit('user_typing', {
          conversationId,
          userId,
          userName: user.username || user.fullName || 'User',
          isTyping: false,
          timestamp: new Date().toISOString(),
        });

        console.log(`👀 [Gateway] User ${user.username || userId} stopped typing in ${conversationId}`);
        
      } catch (error) {
        // Fallback without user name if cache fails
        this.server.to(conversationId).emit('user_typing', {
          conversationId,
          userId,
          userName: `User ${userId.substring(0, 8)}`,
          isTyping: false,
          timestamp: new Date().toISOString(),
        });
      }

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

  // ✅ CRITICAL FIX: Helper method to enhance message with complete user data
  private async enhanceMessageWithUserData(message: any): Promise<any> {
    try {
      // If message already has sender info, use it
      if (message.sender) {
        return {
          ...message,
          senderId: message.senderId || message.sender.id,
          senderName: message.sender.username || message.sender.fullName || message.sender.displayName || 'User',
          senderAvatar: message.sender.avatarUrl || message.sender.avatar || null,
        };
      }

      // If no sender info, fetch from cache
      if (message.senderId) {
        const user = await this.getUserFromCache(message.senderId);
        return {
          ...message,
          senderName: user.username || user.fullName || user.displayName || 'User',
          senderAvatar: user.avatarUrl || user.avatar || null,
        };
      }

      // Fallback - return message as is
      return message;
    } catch (error) {
      this.logger.warn(`Failed to enhance message with user data: ${error.message}`);
      return message;
    }
  }

  // ✅ Helper method to get user from cache (similar to MessageService)
  private async getUserFromCache(userId: string): Promise<any> {
    const cacheKey = `user:${userId}`;
    let user = await this.cacheManager.get<any>(cacheKey);
    
    if (!user) {
      // In a real implementation, you'd inject UserService or Repository
      // For now, we'll return basic user info
      user = {
        id: userId,
        username: 'User',
        fullName: 'User',
        avatarUrl: null,
      };
      await this.cacheManager.set(cacheKey, user, 300000); // 5 minutes
    }
    
    return user;
  }
}
