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
    
    console.log('💾 [MessageService] sendMessage called:', {
      userId,
      conversationId: createMessageDto.conversationId,
      content: createMessageDto.content?.substring(0, 100),
      type: createMessageDto.type,
      optimisticId,
      timestamp: new Date().toISOString()
    });
    
    try {
      // 1. IMMEDIATE VALIDATION & CACHE CHECK
      console.log('🔍 [MessageService] Starting validation and cache checks...');
      const [sender, conversation, participant] = await Promise.all([
        this.getUserFromCache(userId),
        this.getConversationFromCache(createMessageDto.conversationId),
        this.getParticipantFromCache(createMessageDto.conversationId, userId)
      ]);

      console.log('✅ [MessageService] Cache lookups completed:', {
        hasSender: !!sender,
        hasConversation: !!conversation,
        hasParticipant: !!participant,
        conversationType: conversation?.type,
        conversationId: createMessageDto.conversationId
      });

      // 2. PERMISSION VALIDATION (Fast)
      console.log('🔐 [MessageService] Validating permissions...');
      this.validateMessagePermissions(participant, createMessageDto.type);
      console.log('✅ [MessageService] Permissions validated');

      // 3. CREATE OPTIMISTIC MESSAGE (Immediate Response)
      console.log('⚡ [MessageService] Creating optimistic message...');
      const optimisticMessage = this.createOptimisticMessage(
        sender,
        conversation,
        createMessageDto,
        optimisticId
      );

      console.log('✅ [MessageService] Optimistic message created:', {
        messageId: optimisticMessage.id,
        conversationId: optimisticMessage.conversationId,
        senderId: optimisticMessage.senderId,
        content: optimisticMessage.content?.substring(0, 50)
      });

      // 4. ASYNC DATABASE OPERATIONS (Background)
      console.log('💾 [MessageService] Starting background DB operations...');
      const dbOperationPromise = this.processMessageInBackground(
        optimisticMessage,
        createMessageDto,
        participant,
        conversation
      );

      // Don't await - process in background
      dbOperationPromise.catch(error => {
        console.error('❌ [MessageService] Background DB operation failed:', {
          error: error.message,
          messageId: optimisticMessage.id,
          conversationId: createMessageDto.conversationId
        });
      });

      // 5. IMMEDIATE RESPONSE WITH OPTIMISTIC DATA
      console.log('👥 [MessageService] Fetching participants and unread counts...');
      const participants = await this.getConversationParticipants(createMessageDto.conversationId);
      const unreadCounts = await this.calculateUnreadCounts(createMessageDto.conversationId, userId);

      console.log('📊 [MessageService] Response data prepared:', {
        participantCount: participants?.length,
        hasUnreadCounts: !!unreadCounts,
        processingTime: Date.now() - startTime
      });

      // 6. EMIT REAL-TIME EVENTS (Non-blocking)
      console.log('📢 [MessageService] Emitting real-time events...');
      this.emitOptimisticMessageEvents(optimisticMessage, participants);

      // 7. LOG PERFORMANCE
      const processingTime = Date.now() - startTime;
      this.logger.log(`Optimistic message sent in ${processingTime}ms`);
      console.log(`⚡ [MessageService] Total processing time: ${processingTime}ms`);

      // 8. HANDLE BACKGROUND COMPLETION
      dbOperationPromise
        .then(async (persistedMessage) => {
          console.log('✅ [MessageService] Message persisted to DB:', {
            messageId: persistedMessage?.id,
            originalOptimisticId: optimisticMessage.id
          });
          await this.handleMessagePersisted(optimisticMessage, persistedMessage, participants);
        })
        .catch(async (error) => {
          console.error('❌ [MessageService] DB persistence failed:', {
            error: error.message,
            messageId: optimisticMessage.id,
            conversationId: createMessageDto.conversationId
          });
          await this.handleMessageFailed(optimisticMessage, error, participants);
        });

      const response = {
        message: optimisticMessage,
        optimisticId: optimisticMessage.id,
        participants,
        unreadCounts,
      };

      console.log('🎯 [MessageService] Returning response:', {
        messageId: response.message.id,
        participantCount: response.participants?.length,
        hasUnreadCounts: !!response.unreadCounts,
        processingTime
      });

      return response;

    } catch (error) {
      console.error('❌ [MessageService] sendMessage failed:', {
        error: error.message,
        stack: error.stack,
        userId,
        conversationId: createMessageDto.conversationId,
        timestamp: new Date().toISOString()
      });
      
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
   * Ensure that a space conversation exists in the database
   * This is needed because space messages reference conversation IDs that may not exist
   */
  private async ensureSpaceConversationExists(
    queryRunner: QueryRunner,
    conversationId: string,
    originalSpaceConversationId: string
  ): Promise<void> {
    console.log('🔍 [MessageService] Checking if space conversation exists in DB:', {
      conversationId,
      originalSpaceConversationId
    });

    // Check if conversation already exists
    const existingConversation = await queryRunner.manager.findOne(Conversation, {
      where: { id: conversationId }
    });

    if (existingConversation) {
      console.log('✅ [MessageService] Space conversation already exists in DB');
      return;
    }

    console.log('📦 [MessageService] Creating space conversation in DB...');

    // Extract space ID from the original conversation ID
    const spaceId = originalSpaceConversationId.replace('space-', '');

    // Create conversation record for the space
    const conversation = queryRunner.manager.create(Conversation, {
      id: conversationId, // Use the extracted UUID
      name: `Space Chat - ${spaceId}`,
      type: ConversationType.SPACE, // ✅ Use SPACE type for space conversations
      spaceId: spaceId, // Store reference to space
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
      metadata: {
        isSpaceConversation: true,
        originalSpaceId: spaceId,
        spaceConversationId: originalSpaceConversationId
      } as any
    });

    await queryRunner.manager.save(Conversation, conversation);
    
    console.log('✅ [MessageService] Space conversation created in DB:', {
      conversationId,
      spaceId,
      name: conversation.name
    });
  }

  /**
   * Background database operations for message persistence
   * Optimized for faster persistence with batched operations
   */
  private async processMessageInBackground(
    optimisticMessage: Message,
    dto: CreateMessageDto,
    participant: ConversationParticipant,
    conversation: Conversation
  ): Promise<Message> {
    const dbStartTime = Date.now();
    console.log('💾 [MessageService] Starting optimized background DB processing:', {
      optimisticMessageId: optimisticMessage.id,
      conversationId: dto.conversationId,
      content: dto.content?.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('🏗️ [MessageService] Creating persistent message entity...');
      
      // 1. Handle space conversations - ensure conversation exists in DB (optimized)
      const isSpaceMessage = dto.conversationId.startsWith('space-');
      const actualConversationId = isSpaceMessage ? 
        dto.conversationId.replace('space-', '') : // Extract UUID from space-{uuid}
        dto.conversationId;
      
      // Parallel execution for space conversation handling
      let spaceConversationPromise: Promise<void> | null = null;
      if (isSpaceMessage) {
        console.log('🏢 [MessageService] Space message detected, ensuring conversation exists in DB...');
        spaceConversationPromise = this.ensureSpaceConversationExists(queryRunner, actualConversationId, dto.conversationId);
      }
      
      // 2. Create persistent message metadata with proper typing (while space conversation is being created)
      const baseMetadata = this.extractMessageMetadata(dto.content || '', dto.mentions || []);
      const messageMetadata = {
        ...baseMetadata,
        isSpaceMessage,
        originalConversationId: dto.conversationId, // Store original space-{uuid} format
        spaceId: isSpaceMessage ? dto.conversationId.replace('space-', '') : undefined,
        persistedAt: new Date().toISOString(),
        optimisticId: optimisticMessage.id // Store optimistic ID for tracking
      };

      console.log('🔧 [MessageService] Conversation ID conversion:', {
        original: dto.conversationId,
        converted: actualConversationId,
        isSpaceMessage
      });

      // Wait for space conversation creation if needed
      if (spaceConversationPromise) {
        await spaceConversationPromise;
      }

      const message = queryRunner.manager.create(Message, {
        conversationId: actualConversationId, // Use clean UUID for DB
        senderId: optimisticMessage.senderId,
        type: dto.type,
        content: dto.content || '',
        status: MessageStatus.SENT,
        replyToId: dto.replyToId,
        threadId: dto.threadId,
        attachments: dto.attachments || [],
        metadata: messageMetadata as any, // Cast to allow additional properties
        mentions: dto.mentions || [],
        clientTimestamp: optimisticMessage.createdAt,
        serverTimestamp: new Date(),
        isOptimistic: false,
      });

      console.log('📊 [MessageService] Message entity created, saving to DB...', {
        messageId: message.id,
        conversationId: message.conversationId,
        originalConversationId: dto.conversationId,
        isSpaceMessage
      });

      // 3. Save message to database with optimized query
      const saveStartTime = Date.now();
      const savedMessage = await queryRunner.manager.save(Message, message);
      const saveTime = Date.now() - saveStartTime;
      
      console.log('✅ [MessageService] Message saved to DB:', {
        messageId: savedMessage.id,
        conversationId: savedMessage.conversationId,
        saveTime: `${saveTime}ms`,
        createdAt: savedMessage.createdAt,
        isSpaceMessage: dto.conversationId.startsWith('space-')
      });

      // 4. Batch update operations for better performance
      const updatePromises: Promise<any>[] = [];
      
      // Update conversation activity (skip for virtual space conversations)
      if (!dto.conversationId.startsWith('space-')) {
        console.log('🔄 [MessageService] Scheduling conversation activity update...');
        updatePromises.push(this.updateConversationActivity(queryRunner, conversation.id, savedMessage.id));
        
        // Update participant read status (skip for virtual space participants)
        console.log('👥 [MessageService] Scheduling participant unread counts update...');
        updatePromises.push(this.updateParticipantUnreadCounts(queryRunner, conversation.id, optimisticMessage.senderId));
      } else {
        console.log('⏭️ [MessageService] Skipping conversation and participant updates for space conversation');
      }

      // Execute all updates in parallel
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // 5. Commit transaction first, then do cache updates
      await queryRunner.commitTransaction();
      const dbTime = Date.now() - dbStartTime;
      console.log('✅ [MessageService] Transaction committed successfully:', {
        dbProcessingTime: `${dbTime}ms`,
        messageId: savedMessage.id
      });

      // 6. Cache updates (after commit for consistency)
      console.log('💾 [MessageService] Updating message cache...');
      // Don't await cache update - do it in background
      this.updateMessageCache(savedMessage).catch(error => {
        console.error('❌ Cache update failed:', error.message);
      });

      this.logger.log(`Message persisted: ${savedMessage.id} in ${dbTime}ms`);
      console.log('🎯 [MessageService] Background DB processing completed:', {
        messageId: savedMessage.id,
        totalProcessingTime: `${dbTime}ms`,
        saveTime: `${saveTime}ms`
      });
      
      return savedMessage;

    } catch (error) {
      const dbTime = Date.now() - dbStartTime;
      console.error('❌ [MessageService] Background DB processing failed:', {
        error: error.message,
        stack: error.stack,
        optimisticMessageId: optimisticMessage.id,
        conversationId: dto.conversationId,
        processingTime: `${dbTime}ms`
      });
      
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
   * Optimized for faster retrieval with progressive loading
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
    const queryStartTime = Date.now();
    const cacheKey = `messages:${conversationId}:${limit}:${before || 'null'}:${after || 'null'}`;
    
    console.log('🔍 [MessageService] Getting messages with optimized caching:', {
      conversationId: conversationId,
      userId,
      limit,
      before,
      after
    });
    
    // Try cache first with extended logging
    const cacheStartTime = Date.now();
    const cached = await this.cacheManager.get<any>(cacheKey);
    const cacheTime = Date.now() - cacheStartTime;
    
    if (cached) {
      console.log('⚡ [MessageService] Cache hit - returning cached messages:', {
        messageCount: cached.messages?.length,
        totalCount: cached.totalCount,
        cacheTime: `${cacheTime}ms`,
        conversationId
      });
      return cached;
    }

    console.log('💾 [MessageService] Cache miss - querying database:', {
      cacheTime: `${cacheTime}ms`,
      conversationId
    });

    // Verify participant access with caching
    const participantStartTime = Date.now();
    const participant = await this.getParticipantFromCache(conversationId, userId);
    if (!participant || !participant.isActive()) {
      throw new ForbiddenException('Access denied to conversation');
    }
    const participantTime = Date.now() - participantStartTime;

    // Handle space conversations - convert conversationId for DB query
    const isSpaceConversation = conversationId.startsWith('space-');
    const dbConversationId = isSpaceConversation ? 
      conversationId.replace('space-', '') : 
      conversationId;

    console.log('🔍 [MessageService] Database query preparation:', {
      requestedConversationId: conversationId,
      dbConversationId,
      isSpaceConversation,
      participantCheckTime: `${participantTime}ms`
    });

    // Build optimized query with proper indexing hints
    const dbQueryStartTime = Date.now();
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoin('messages', 'parentMessage', 'parentMessage.id = message.parentMessageId')
      .leftJoinAndSelect('parentMessage.sender', 'parentSender')
      .where('message.conversationId = :conversationId', { conversationId: dbConversationId })
      .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit + 1); // Get one extra to check if there are more

    // For space conversations, also filter by space message metadata
    if (isSpaceConversation) {
      queryBuilder.andWhere("message.metadata->>'isSpaceMessage' = 'true'");
    }

    // Add pagination with optimized queries
    if (before) {
      queryBuilder.andWhere('message.createdAt < (SELECT createdAt FROM messages WHERE id = :before)', { before });
    }
    if (after) {
      queryBuilder.andWhere('message.createdAt > (SELECT createdAt FROM messages WHERE id = :after)', { after });
    }

    // Execute query with timing
    const messages = await queryBuilder.getMany();
    const dbQueryTime = Date.now() - dbQueryStartTime;
    
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra message
    }

    // Get total count with optimized query (parallel execution for better performance)
    const countQueryStartTime = Date.now();
    const totalCountQuery = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId: dbConversationId })
      .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED });
    
    if (isSpaceConversation) {
      totalCountQuery.andWhere("message.metadata->>'isSpaceMessage' = 'true'");
    }
    
    const totalCount = await totalCountQuery.getCount();
    const countTime = Date.now() - countQueryStartTime;

    const totalQueryTime = Date.now() - queryStartTime;
    console.log('✅ [MessageService] Messages retrieved with performance metrics:', {
      messageCount: messages.length,
      totalCount,
      hasMore,
      conversationId: conversationId,
      performanceMetrics: {
        totalTime: `${totalQueryTime}ms`,
        cacheTime: `${cacheTime}ms`,
        participantTime: `${participantTime}ms`,
        dbQueryTime: `${dbQueryTime}ms`,
        countTime: `${countTime}ms`
      }
    });

    const result = {
      messages: messages.reverse(), // Reverse to get chronological order
      hasMore,
      totalCount,
    };

    // Cache with progressive TTL - frequently accessed conversations get longer cache
    const cacheKey_base = `cache_stats:${conversationId}`;
    const cacheStats = await this.cacheManager.get<{ hits: number }>(cacheKey_base) || { hits: 0 };
    const cacheTTL = Math.min(300000, 30000 + (cacheStats.hits * 10000)); // 30s to 5min based on usage
    
    // Update cache stats
    await this.cacheManager.set(cacheKey_base, { hits: cacheStats.hits + 1 }, 86400000); // 24h stats
    
    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTTL);
    
    console.log('💾 [MessageService] Result cached with adaptive TTL:', {
      cacheTTL: `${cacheTTL}ms`,
      cacheHits: cacheStats.hits + 1
    });

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
    console.log('🔍 [MessageService] Getting conversation from cache:', conversationId);
    
    // Handle space conversations differently
    const isSpaceConversation = conversationId.startsWith('space-');
    
    if (isSpaceConversation) {
      console.log('🏢 [MessageService] Detected space conversation:', conversationId);
      // For space conversations, we'll create a virtual conversation or handle differently
      return await this.handleSpaceConversation(conversationId);
    }
    
    const cacheKey = `conversation:${conversationId}`;
    let conversation = await this.cacheManager.get<Conversation>(cacheKey);
    
    console.log('💾 [MessageService] Cache lookup result:', {
      conversationId,
      foundInCache: !!conversation,
      cacheKey
    });
    
    if (!conversation) {
      console.log('🔍 [MessageService] Not in cache, fetching from DB...');
      conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });
      
      if (!conversation) {
        console.error('❌ [MessageService] Conversation not found in DB:', conversationId);
        throw new NotFoundException(`Conversation not found: ${conversationId}`);
      }
      
      console.log('✅ [MessageService] Found in DB, caching...');
      await this.cacheManager.set(cacheKey, conversation, 300000); // 5 minutes
    }
    
    console.log('✅ [MessageService] Returning conversation:', {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name
    });
    
    return conversation;
  }

  /**
   * Handle space conversations by creating virtual conversations or linking to space
   */
  private async handleSpaceConversation(conversationId: string): Promise<Conversation> {
    console.log('🏢 [MessageService] Handling space conversation:', conversationId);
    
    // Extract space ID from conversation ID (format: space-{spaceId})
    const spaceId = conversationId.replace('space-', '');
    console.log('🆔 [MessageService] Extracted space ID:', spaceId);
    
    // Check if virtual conversation already exists in cache
    const cacheKey = `conversation:${conversationId}`;
    let conversation = await this.cacheManager.get<Conversation>(cacheKey);
    
    if (conversation) {
      console.log('✅ [MessageService] Found cached space conversation');
      return conversation;
    }
    
    // For space conversations, don't check database - always create virtual conversation
    console.log('📦 [MessageService] Creating virtual space conversation (skipping DB check)');
    // Create a virtual conversation object for space chat
    conversation = {
      id: conversationId,
      name: `Space Chat - ${spaceId}`,
      type: 'SPACE' as any, // Add SPACE type if not exists
      spaceId: spaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add other required properties
    } as Conversation;
    
    // Cache the virtual conversation
    await this.cacheManager.set(cacheKey, conversation, 300000); // 5 minutes
    
    console.log('✅ [MessageService] Space conversation ready:', {
      id: conversation.id,
      spaceId,
      type: conversation.type
    });
    
    return conversation;
  }

  private async getParticipantFromCache(conversationId: string, userId: string): Promise<ConversationParticipant> {
    console.log('👤 [MessageService] Getting participant from cache:', { conversationId, userId });
    
    const cacheKey = `participant:${conversationId}:${userId}`;
    
    // Handle space conversations - participants are space members
    const isSpaceConversation = conversationId.startsWith('space-');
    
    if (isSpaceConversation) {
      console.log('🏢 [MessageService] Handling space participant:', conversationId);
      return await this.handleSpaceParticipant(conversationId, userId);
    }
    
    // Try to get from cache first
    const cachedData = await this.cacheManager.get<any>(cacheKey);
    
    console.log('💾 [MessageService] Participant cache lookup:', {
      cacheKey,
      foundInCache: !!cachedData
    });
    
    if (cachedData) {
      // Recreate entity instance from cached data to restore methods
      const participant = Object.assign(new ConversationParticipant(), cachedData);
      return participant;
    }

    // If not in cache, fetch from database
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });
    
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Cache the raw data (not the entity instance)
    await this.cacheManager.set(cacheKey, {
      ...participant,
      // Ensure we cache all necessary properties
      id: participant.id,
      conversationId: participant.conversationId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joinedAt,
      lastReadAt: participant.lastReadAt,
      unreadCount: participant.unreadCount,
      canSendMessages: participant.canSendMessages,
      canUploadFiles: participant.canUploadFiles,
      canAddMembers: participant.canAddMembers,
      metadata: participant.metadata
    }, 60000); // 1 minute

    return participant;
  }

  /**
   * Handle space participants by creating virtual participants for space members
   */
  private async handleSpaceParticipant(conversationId: string, userId: string): Promise<ConversationParticipant> {
    console.log('🏢 [MessageService] Handling space participant:', { conversationId, userId });
    
    const cacheKey = `participant:${conversationId}:${userId}`;
    
    // Try cache first
    const cachedData = await this.cacheManager.get<any>(cacheKey);
    if (cachedData) {
      console.log('✅ [MessageService] Found cached space participant');
      return Object.assign(new ConversationParticipant(), cachedData);
    }
    
    // Extract space ID
    const spaceId = conversationId.replace('space-', '');
    
    // TODO: Check if user is a member of the space
    // For now, create a virtual participant that allows messaging
    const participant = new ConversationParticipant();
    participant.id = `space-participant-${spaceId}-${userId}`;
    participant.conversationId = conversationId;
    participant.userId = userId;
    participant.role = 'member' as any;
    participant.status = 'active' as any;
    participant.joinedAt = new Date();
    participant.lastReadAt = new Date();
    participant.unreadCount = 0;
    participant.canSendMessages = true;
    participant.canUploadFiles = true;
    participant.canAddMembers = false;
    participant.metadata = {};
    
    // Cache the virtual participant (convert to plain object for caching)
    const cacheData = {
      id: participant.id,
      conversationId: participant.conversationId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joinedAt,
      lastReadAt: participant.lastReadAt,
      unreadCount: participant.unreadCount,
      canSendMessages: participant.canSendMessages,
      canUploadFiles: participant.canUploadFiles,
      canAddMembers: participant.canAddMembers,
      metadata: participant.metadata
    };
    
    await this.cacheManager.set(cacheKey, cacheData, 60000); // 1 minute
    
    console.log('✅ [MessageService] Created virtual space participant:', {
      participantId: participant.id,
      spaceId,
      userId
    });
    
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
    console.log('👥 [MessageService] Getting conversation participants:', conversationId);
    
    const cacheKey = `participants:${conversationId}`;
    let participants = await this.cacheManager.get<ConversationParticipant[]>(cacheKey);
    
    if (participants) {
      console.log('✅ [MessageService] Found cached participants:', participants.length);
      return participants;
    }
    
    // Handle space conversations differently
    const isSpaceConversation = conversationId.startsWith('space-');
    
    if (isSpaceConversation) {
      console.log('🏢 [MessageService] Handling space conversation participants');
      // For space conversations, return empty array or virtual participants
      // In a real implementation, you'd fetch space members from the space service
      participants = [];
      
      console.log('📦 [MessageService] Created virtual participants list for space');
      await this.cacheManager.set(cacheKey, participants, 60000); // 1 minute
      return participants;
    }
    
    // For regular conversations, query the database
    console.log('🔍 [MessageService] Querying DB for regular conversation participants');
    participants = await this.participantRepository.find({
      where: { conversationId },
      relations: ['user'],
    });
    
    console.log('✅ [MessageService] Found DB participants:', participants.length);
    await this.cacheManager.set(cacheKey, participants, 60000); // 1 minute
    
    return participants;
  }

  private async calculateUnreadCounts(conversationId: string, excludeUserId: string): Promise<Record<string, number>> {
    console.log('📊 [MessageService] Calculating unread counts:', { conversationId, excludeUserId });
    
    const participants = await this.getConversationParticipants(conversationId);
    const unreadCounts: Record<string, number> = {};

    // Handle space conversations differently
    const isSpaceConversation = conversationId.startsWith('space-');
    
    if (isSpaceConversation) {
      console.log('🏢 [MessageService] Space conversation - returning empty unread counts');
      return unreadCounts;
    }

    for (const participant of participants) {
      if (participant.userId !== excludeUserId) {
        participant.incrementUnreadCount();
        unreadCounts[participant.userId] = participant.unreadCount;
      }
    }

    console.log('✅ [MessageService] Unread counts calculated:', Object.keys(unreadCounts).length);
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
      console.log('📍 [MessageService] Tracking message delivery:', {
        messageId,
        participantCount: participants.length,
        isOptimisticId: messageId.startsWith('optimistic_')
      });

      // Skip delivery tracking for optimistic messages (they'll be tracked when persisted with real ID)
      if (messageId.startsWith('optimistic_')) {
        console.log('⏭️ [MessageService] Skipping delivery tracking for optimistic message');
        return;
      }

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
      
      // Update message delivery status only for non-optimistic messages
      const existingMessage = await this.messageRepository.findOne({ where: { id: messageId } });
      if (existingMessage) {
        const updatedMetadata = {
          ...existingMessage.metadata,
          deliveryTracked: true,
          deliveryInitiatedAt: new Date().toISOString(),
        };
        
        await this.messageRepository.update(messageId, { metadata: updatedMetadata });
        console.log('✅ [MessageService] Message delivery tracking completed');
      } else {
        console.log('⚠️ [MessageService] Message not found in DB for delivery tracking, skipping metadata update');
      }

    } catch (error) {
      console.error('❌ [MessageService] Error tracking message delivery:', {
        error: error.message,
        messageId,
        participantCount: participants.length
      });
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
