import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getErrorMessage, getErrorStack } from '../shared/utils/error.utils';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Message, MessageType, MessageStatus } from '../shared/entities/message.entity';
import { MessageReaction } from '../shared/entities/message-reaction.entity';
import { Conversation, ConversationType } from '../shared/entities/conversation.entity';
import { ConversationParticipant, ParticipantRole, ParticipantStatus } from '../shared/entities/conversation-participant.entity';
import { User } from '../shared/entities/user.entity';

interface CreateMessageDto {
  conversationId: string;
  type: MessageType;
  content?: string;
  replyToId?: string;
  threadId?: string;
  attachments?: {
    url: string;
    type: string;
    name: string;
    size: number;
  }[];
  metadata?: Record<string, any>;
  mentions?: string[];
}

export interface SendMessageResponse {
  message: Message;
  optimisticId: string;
  participants: ConversationParticipant[];
  unreadCounts: Record<string, number>;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(MessageReaction)
    private reactionRepository: Repository<MessageReaction>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Enterprise Message Sending with Optimistic Updates
   * Returns immediate response while processing DB writes asynchronously
   */
  async sendMessage(
    userId: string,
    createMessageDto: CreateMessageDto,
    optimisticId?: string
  ): Promise<SendMessageResponse> {
    const startTime = Date.now();
    
    try {
      // 1. IMMEDIATE VALIDATION & CACHE CHECK
      const [sender, conversation, participant] = await Promise.all([
        this.getUserFromCache(userId),
        this.getConversationFromCache(createMessageDto.conversationId),
        this.getParticipantFromCache(createMessageDto.conversationId, userId)
      ]);

      // 2. PERMISSION VALIDATION (Fast)
      this.validateMessagePermissions(participant, createMessageDto.type);

      // 3. CREATE OPTIMISTIC MESSAGE (Immediate Response)
      const optimisticMessage = this.createOptimisticMessage(
        sender,
        conversation,
        createMessageDto,
        optimisticId
      );

      // 4. ASYNC DATABASE OPERATIONS (Background)
      const dbOperationPromise = this.processMessageInBackground(
        optimisticMessage,
        createMessageDto,
        participant,
        conversation
      );

      // 5. IMMEDIATE RESPONSE WITH OPTIMISTIC DATA
      const participants = await this.getConversationParticipants(createMessageDto.conversationId);
      const unreadCounts = await this.calculateUnreadCounts(createMessageDto.conversationId, userId);

      // 6. EMIT REAL-TIME EVENTS (Non-blocking)
      this.emitOptimisticMessageEvents(optimisticMessage, participants);

      // 7. LOG PERFORMANCE
      this.logger.log(`Optimistic message sent in ${Date.now() - startTime}ms`);

      // 8. HANDLE BACKGROUND COMPLETION
      dbOperationPromise
        .then(async (persistedMessage) => {
          await this.handleMessagePersisted(optimisticMessage, persistedMessage, participants);
        })
        .catch(async (error) => {
          await this.handleMessageFailed(optimisticMessage, error, participants);
        });

      return {
        message: optimisticMessage,
        optimisticId: optimisticMessage.id,
        participants,
        unreadCounts,
      };

    } catch (error) {
      this.logger.error(`Message send failed: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Create optimistic message for immediate UI response
   */
  private createOptimisticMessage(
    sender: User,
    conversation: Conversation,
    dto: CreateMessageDto,
    optimisticId?: string
  ): Message {
    const message = new Message();
    
    // Use provided optimistic ID or generate one
    message.id = optimisticId || `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    message.conversationId = dto.conversationId;
    message.senderId = sender.id;
    message.type = dto.type;
    message.content = dto.content || '';
    message.status = MessageStatus.PENDING;
    message.parentMessageId = dto.replyToId;
    message.threadId = dto.threadId;
    message.metadata = {
      ...dto.metadata,
      mentions: dto.mentions || [],
    };
    
    // Set timestamps
    const now = new Date();
    message.createdAt = now;
    message.updatedAt = now;
    message.clientTimestamp = now;
    message.serverTimestamp = null; // Will be set when persisted

    // Set relationships for UI
    message.sender = sender;
    message.conversation = conversation;

    return message;
  }

  /**
   * Background database operations for message persistence
   */
  private async processMessageInBackground(
    optimisticMessage: Message,
    dto: CreateMessageDto,
    participant: ConversationParticipant,
    conversation: Conversation
  ): Promise<Message> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create persistent message
      const message = queryRunner.manager.create(Message, {
        conversationId: dto.conversationId,
        senderId: optimisticMessage.senderId,
        type: dto.type,
        content: dto.content || '',
        status: MessageStatus.SENT,
        replyToId: dto.replyToId,
        threadId: dto.threadId,
        attachments: dto.attachments || [],
        metadata: this.extractMessageMetadata(dto.content || '', dto.mentions || []),
        mentions: dto.mentions || [],
        clientTimestamp: optimisticMessage.createdAt,
        serverTimestamp: new Date(),
        isOptimistic: false,
      });

      // 2. Save message
      const savedMessage = await queryRunner.manager.save(Message, message);

      // 3. Update conversation activity
      await this.updateConversationActivity(queryRunner, conversation.id, savedMessage.id);

      // 4. Update participant read status
      await this.updateParticipantUnreadCounts(queryRunner, conversation.id, optimisticMessage.senderId);

      // 5. Cache updates
      await this.updateMessageCache(savedMessage);

      await queryRunner.commitTransaction();
      
      this.logger.log(`Message persisted: ${savedMessage.id}`);
      return savedMessage;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Background message processing failed: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle successful message persistence
   */
  private async handleMessagePersisted(
    optimisticMessage: Message,
    persistedMessage: Message,
    participants: ConversationParticipant[]
  ): Promise<void> {
    // Update message status to confirmed
    persistedMessage.status = MessageStatus.DELIVERED;
    
    // Emit message confirmed event
    this.eventEmitter.emit('message.confirmed', {
      optimisticId: optimisticMessage.id,
      persistedMessage,
      conversationId: persistedMessage.conversationId,
      participants: participants.map(p => p.userId),
    });

    // Update delivery tracking
    await this.trackMessageDelivery(persistedMessage.id, participants);
  }

  /**
   * Handle message send failure
   */
  private async handleMessageFailed(
    optimisticMessage: Message,
    error: any,
    participants: ConversationParticipant[]
  ): Promise<void> {
    this.logger.error(`Message persistence failed: ${error.message}`);

    // Emit message failed event
    this.eventEmitter.emit('message.failed', {
      optimisticId: optimisticMessage.id,
      error: error.message,
      conversationId: optimisticMessage.conversationId,
      senderId: optimisticMessage.senderId,
    });
  }

  /**
   * Emit real-time events for optimistic message
   */
  private emitOptimisticMessageEvents(
    message: Message,
    participants: ConversationParticipant[]
  ): void {
    // Emit to all active participants
    const activeParticipants = participants
      .filter(p => p.isActive())
      .map(p => p.userId);

    this.eventEmitter.emit('message.sent', {
      message,
      conversationId: message.conversationId,
      participants: activeParticipants,
      isOptimistic: true,
    });

    // Emit typing stopped event for sender
    this.eventEmitter.emit('typing.stopped', {
      conversationId: message.conversationId,
      userId: message.senderId,
    });
  }

  /**
   * Get messages with enterprise caching and pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    before?: string,
    after?: string
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    totalCount: number;
  }> {
    const cacheKey = `messages:${conversationId}:${limit}:${before || 'null'}:${after || 'null'}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify participant access
    const participant = await this.getParticipantFromCache(conversationId, userId);
    if (!participant || !participant.isActive()) {
      throw new ForbiddenException('Access denied to conversation');
    }

    // Build query
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyTo', 'replyTo')
      .leftJoinAndSelect('replyTo.sender', 'replyToSender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit + 1); // Get one extra to check if there are more

    // Add pagination
    if (before) {
      queryBuilder.andWhere('message.createdAt < (SELECT createdAt FROM messages WHERE id = :before)', { before });
    }
    if (after) {
      queryBuilder.andWhere('message.createdAt > (SELECT createdAt FROM messages WHERE id = :after)', { after });
    }

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;
    
    if (hasMore) {
      messages.pop(); // Remove the extra message
    }

    // Get total count
    const totalCount = await this.messageRepository.count({
      where: {
        conversationId,
        status: MessageStatus.DELETED,
      },
    });

    const result = {
      messages: messages.reverse(), // Reverse to get chronological order
      hasMore,
      totalCount,
    };

    // Cache for 30 seconds
    await this.cacheManager.set(cacheKey, result, 30000);

    return result;
  }

  /**
   * Mark messages as read with optimistic updates
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    messageId: string
  ): Promise<{ success: boolean; unreadCount: number }> {
    try {
      // Get participant
      const participant = await this.getParticipantFromCache(conversationId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      // Optimistic update
      participant.updateLastRead(messageId);
      
      // Background database update
      this.updateParticipantReadStatus(conversationId, userId, messageId)
        .catch(error => {
          this.logger.error(`Failed to update read status: ${error.message}`);
        });

      // Emit read receipt event
      this.eventEmitter.emit('message.read', {
        conversationId,
        userId,
        messageId,
        readAt: new Date(),
      });

      return {
        success: true,
        unreadCount: 0,
      };

    } catch (error) {
      this.logger.error(`Mark as read failed: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Search messages with enterprise performance
   */
  async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    messages: Message[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cacheKey = `search:${userId}:${query}:${conversationId || 'all'}:${limit}:${offset}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's accessible conversations
    const accessibleConversations = await this.getUserConversations(userId);
    const conversationIds = accessibleConversations.map(c => c.id);

    if (conversationIds.length === 0) {
      return { messages: [], totalCount: 0, hasMore: false };
    }

    // Build search query
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED })
      .andWhere('LOWER(message.content) LIKE LOWER(:query)', { query: `%${query}%` })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId });
    }

    const [messages, totalCount] = await queryBuilder.getManyAndCount();

    const result = {
      messages,
      totalCount,
      hasMore: offset + messages.length < totalCount,
    };

    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60000);

    return result;
  }

  // Helper Methods
  private async getUserFromCache(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    let user = await this.cacheManager.get<User>(cacheKey);
    
    if (!user) {
      user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.cacheManager.set(cacheKey, user, 300000); // 5 minutes
    }
    
    return user;
  }

  private async getConversationFromCache(conversationId: string): Promise<Conversation> {
    const cacheKey = `conversation:${conversationId}`;
    let conversation = await this.cacheManager.get<Conversation>(cacheKey);
    
    if (!conversation) {
      conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      await this.cacheManager.set(cacheKey, conversation, 300000); // 5 minutes
    }
    
    return conversation;
  }

  private async getParticipantFromCache(conversationId: string, userId: string): Promise<ConversationParticipant> {
    const cacheKey = `participant:${conversationId}:${userId}`;
    let participant = await this.cacheManager.get<ConversationParticipant>(cacheKey);
    
    if (!participant) {
      participant = await this.participantRepository.findOne({
        where: { conversationId, userId },
      });
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }
      await this.cacheManager.set(cacheKey, participant, 60000); // 1 minute
    }
    
    return participant;
  }

  private validateMessagePermissions(participant: ConversationParticipant, messageType: MessageType): void {
    if (!participant.canPerformAction('send_message')) {
      throw new ForbiddenException('Cannot send messages in this conversation');
    }

    if (messageType !== MessageType.TEXT && !participant.canPerformAction('upload_file')) {
      throw new ForbiddenException('Cannot upload files in this conversation');
    }
  }

  private extractMessageMetadata(content: string, mentions: string[]): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    if (urls.length > 0) {
      metadata.urls = urls;
    }

    // Extract hashtags
    const hashtagRegex = /#(\w+)/g;
    const hashtags = content.match(hashtagRegex) || [];
    if (hashtags.length > 0) {
      metadata.hashtags = hashtags;
    }

    // Add mentions
    if (mentions.length > 0) {
      metadata.mentions = mentions;
    }

    return metadata;
  }

  private async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const cacheKey = `participants:${conversationId}`;
    let participants = await this.cacheManager.get<ConversationParticipant[]>(cacheKey);
    
    if (!participants) {
      participants = await this.participantRepository.find({
        where: { conversationId },
        relations: ['user'],
      });
      await this.cacheManager.set(cacheKey, participants, 60000); // 1 minute
    }
    
    return participants;
  }

  private async calculateUnreadCounts(conversationId: string, excludeUserId: string): Promise<Record<string, number>> {
    const participants = await this.getConversationParticipants(conversationId);
    const unreadCounts: Record<string, number> = {};

    for (const participant of participants) {
      if (participant.userId !== excludeUserId) {
        participant.incrementUnreadCount();
        unreadCounts[participant.userId] = participant.unreadCount;
      }
    }

    return unreadCounts;
  }

  private async updateConversationActivity(queryRunner: QueryRunner, conversationId: string, lastMessageId: string): Promise<void> {
    await queryRunner.manager.update(Conversation, conversationId, {
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async updateParticipantUnreadCounts(queryRunner: QueryRunner, conversationId: string, senderId: string): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update(ConversationParticipant)
      .set({ unreadCount: () => 'unread_count + 1' })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('user_id != :senderId', { senderId })
      .andWhere('status = :status', { status: 'active' })
      .execute();
  }

  private async updateParticipantReadStatus(conversationId: string, userId: string, messageId: string): Promise<void> {
    await this.participantRepository.update(
      { conversationId, userId },
      {
        lastReadAt: new Date(),
        lastReadMessageId: messageId,
        unreadCount: 0,
      }
    );

    // Update cache
    const cacheKey = `participant:${conversationId}:${userId}`;
    await this.cacheManager.del(cacheKey);
  }

  private async updateMessageCache(message: Message): Promise<void> {
    const cacheKey = `message:${message.id}`;
    await this.cacheManager.set(cacheKey, message, 300000); // 5 minutes
  }

  private async trackMessageDelivery(messageId: string, participants: ConversationParticipant[]): Promise<void> {
    try {
      // Create delivery tracking records for each participant
      const deliveryPromises = participants.map(async (participant) => {
        // Skip the sender (they don't need delivery tracking)
        const message = await this.messageRepository.findOne({ 
          where: { id: messageId }, 
          select: ['senderId'] 
        });
        
        if (message && participant.userId === message.senderId) {
          return;
        }

        // Create delivery record
        const deliveryRecord = {
          messageId,
          userId: participant.userId,
          status: 'sent',
          sentAt: new Date(),
        };

        // Store in cache for quick access (real implementation would use database)
        const cacheKey = `message-delivery:${messageId}:${participant.userId}`;
        await this.cacheManager.set(cacheKey, deliveryRecord, 86400); // 24 hours

        // Emit event for notification service (when implemented)
        if (participant.notificationsEnabled) {
          this.eventEmitter.emit('notification.send', {
            userId: participant.userId,
            messageId,
            type: 'message',
            conversationId: message?.conversationId,
            timestamp: new Date(),
          });
        }

        // Emit WebSocket event for real-time delivery status
        this.eventEmitter.emit('message.delivery_update', {
          messageId,
          userId: participant.userId,
          status: 'sent',
          timestamp: new Date(),
        });
      });

      await Promise.all(deliveryPromises);
      
      // Update message delivery status
      const existingMessage = await this.messageRepository.findOne({ where: { id: messageId } });
      if (existingMessage) {
        const updatedMetadata = {
          ...existingMessage.metadata,
          deliveryTracked: true,
          deliveryInitiatedAt: new Date().toISOString(),
        };
        
        await this.messageRepository.update(messageId, { metadata: updatedMetadata });
      }

    } catch (error) {
      console.error('Error tracking message delivery:', error);
      // Don't throw error - delivery tracking failure shouldn't break message sending
    }
  }

  private async getUserConversations(userId: string): Promise<Conversation[]> {
    const cacheKey = `user-conversations:${userId}`;
    let conversations = await this.cacheManager.get<Conversation[]>(cacheKey);
    
    if (!conversations) {
      const participants = await this.participantRepository.find({
        where: { userId, status: ParticipantStatus.ACTIVE },
        relations: ['conversation'],
      });
      conversations = participants.map(p => p.conversation);
      await this.cacheManager.set(cacheKey, conversations, 300000); // 5 minutes
    }
    
    return conversations;
  }

  /**
   * Get message by ID for WebSocket events
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    const cacheKey = `message:${messageId}`;
    let message = await this.cacheManager.get<Message>(cacheKey);
    
    if (!message) {
      message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'conversation'],
      });
      
      if (message) {
        await this.cacheManager.set(cacheKey, message, 300000); // 5 minutes
      }
    }
    
    return message;
  }

  /**
   * Edit a message (with edit history tracking)
   */
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<Message> {
    // Get the message
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user can edit this message
    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
    if (messageAge > maxEditAge) {
      throw new Error('Message is too old to edit');
    }

    // Store edit history
    const editHistory = message.metadata?.editHistory || [];
    editHistory.push({
      content: message.content,
      timestamp: new Date(),
    });

    // Update message
    const updatedMetadata = {
      ...message.metadata,
      editHistory,
      lastEditedAt: new Date().toISOString(),
    };

    await this.messageRepository.update(messageId, {
      content: newContent,
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    // Get updated message
    const updatedMessage = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'conversation'],
    });

    if (updatedMessage) {
      // Update cache
      await this.updateMessageCache(updatedMessage);

      // Emit WebSocket event
      this.eventEmitter.emit('message.edited', {
        messageId,
        conversationId: updatedMessage.conversationId,
        content: newContent,
        editedAt: new Date(),
        editedBy: userId,
      });
    }

    return updatedMessage!;
  }

  /**
   * Delete a message (soft delete for audit trail)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Get the message
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user can delete this message
    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    // Soft delete the message
    const updatedMetadata = {
      ...message.metadata,
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    };

    await this.messageRepository.update(messageId, {
      content: '[Message deleted]',
      metadata: updatedMetadata,
      status: MessageStatus.DELETED,
      updatedAt: new Date(),
    });

    // Remove from cache
    const cacheKey = `message:${messageId}`;
    await this.cacheManager.del(cacheKey);

    // Emit WebSocket event
    this.eventEmitter.emit('message.deleted', {
      messageId,
      conversationId: message.conversationId,
      deletedAt: new Date(),
      deletedBy: userId,
    });
  }

  /**
   * Add or update a reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Check if message exists
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user already reacted with this emoji
    const existingReaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });

    if (existingReaction) {
      // Update existing reaction metadata
      await this.reactionRepository.update(existingReaction.id, {
        metadata: { ...existingReaction.metadata, ...metadata },
      });
    } else {
      // Create new reaction
      const reaction = this.reactionRepository.create({
        messageId,
        userId,
        emoji,
        metadata,
      });
      await this.reactionRepository.save(reaction);
    }

    // Emit WebSocket event
    this.eventEmitter.emit('reaction.added', {
      messageId,
      userId,
      emoji,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const reaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });

    if (reaction) {
      await this.reactionRepository.remove(reaction);

      // Emit WebSocket event
      this.eventEmitter.emit('reaction.removed', {
        messageId,
        userId,
        emoji,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Forward a message to multiple conversations
   */
  async forwardMessage(
    messageId: string,
    userId: string,
    conversationIds: string[],
    comment?: string
  ): Promise<Message[]> {
    // Get the original message
    const originalMessage = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!originalMessage) {
      throw new Error('Message not found');
    }

    // Check if user has access to the original message
    const hasAccess = await this.getParticipantFromCache(originalMessage.conversationId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to original message');
    }

    const forwardedMessages: Message[] = [];

    // Forward to each conversation
    for (const conversationId of conversationIds) {
      try {
        // Check if user can send messages to this conversation
        const participant = await this.getParticipantFromCache(conversationId, userId);
        if (!participant?.canPerformAction('send_message')) {
          continue; // Skip conversations where user can't send messages
        }

        // Create forwarded message
        const forwardedContent = comment 
          ? `${comment}\n\n--- Forwarded message ---\n${originalMessage.content}`
          : `--- Forwarded message ---\n${originalMessage.content}`;

        const forwardDto = {
          conversationId,
          type: originalMessage.type,
          content: forwardedContent,
          metadata: {
            ...originalMessage.metadata,
            isForwarded: true,
            originalMessageId: messageId,
            originalSender: originalMessage.senderId,
            forwardedBy: userId,
            forwardedAt: new Date().toISOString(),
          },
        };

        const response = await this.sendMessage(userId, forwardDto);
        forwardedMessages.push(response.message);

      } catch (error) {
        this.logger.error(`Failed to forward message to conversation ${conversationId}: ${getErrorMessage(error)}`);
        // Continue forwarding to other conversations
      }
    }

    return forwardedMessages;
  }

  /**
   * Get message delivery status
   */
  async getMessageDeliveryStatus(messageId: string, userId: string): Promise<{
    messageId: string;
    deliveryStatus: Array<{
      userId: string;
      username: string;
      status: 'sent' | 'delivered' | 'read';
      timestamp: Date;
    }>;
  }> {
    // Get the message and verify access
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user has access to this conversation
    const hasAccess = await this.getParticipantFromCache(message.conversationId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to message');
    }

    // Get conversation participants
    const participants = await this.getConversationParticipants(message.conversationId);
    const deliveryStatus = [];

    for (const participant of participants) {
      if (participant.userId === message.senderId) {
        continue; // Skip sender
      }

      // Get delivery status from cache
      const cacheKey = `message-delivery:${messageId}:${participant.userId}`;
      const deliveryRecord = await this.cacheManager.get<any>(cacheKey);

      let status = 'sent';
      let timestamp = message.createdAt;

      if (deliveryRecord) {
        status = deliveryRecord.status;
        timestamp = deliveryRecord.timestamp || deliveryRecord.sentAt;
      }

      // Check if message is read (based on participant's last read message)
      if (participant.lastReadMessageId && 
          new Date(message.createdAt) <= new Date(participant.lastReadAt || 0)) {
        status = 'read';
        timestamp = participant.lastReadAt || timestamp;
      }

      deliveryStatus.push({
        userId: participant.userId,
        username: participant.user?.username || 'Unknown',
        status,
        timestamp,
      });
    }

    return {
      messageId,
      deliveryStatus,
    };
  }
}
