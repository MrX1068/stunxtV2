import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Conversation, ConversationType } from '../shared/entities/conversation.entity';
import { ConversationParticipant, ParticipantStatus, ParticipantRole } from '../shared/entities/conversation-participant.entity';
import { User } from '../shared/entities/user.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Check if user has access to a conversation
   */
  async hasUserAccess(conversationId: string, userId: string): Promise<boolean> {
    const cacheKey = `access:${conversationId}:${userId}`;
    
    // Check cache first
    let hasAccess = await this.cacheManager.get<boolean>(cacheKey);
    
    if (hasAccess === undefined) {
      // Check database
      const participant = await this.participantRepository.findOne({
        where: {
          conversationId,
          userId,
          status: ParticipantStatus.ACTIVE,
        },
      });
      
      hasAccess = participant !== null;
      
      // Cache result for 5 minutes
      await this.cacheManager.set(cacheKey, hasAccess, 300000);
    }
    
    return hasAccess;
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const cacheKey = `user-conversations:${userId}`;
    
    // Check cache first
    let conversations = await this.cacheManager.get<Conversation[]>(cacheKey);
    
    if (!conversations) {
      // Get from database
      const participants = await this.participantRepository.find({
        where: {
          userId,
          status: ParticipantStatus.ACTIVE,
        },
        relations: ['conversation'],
      });
      
      conversations = participants.map(p => p.conversation);
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, conversations, 300000);
    }
    
    return conversations;
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const cacheKey = `participants:${conversationId}`;
    
    // Check cache first
    let participants = await this.cacheManager.get<ConversationParticipant[]>(cacheKey);
    
    if (!participants) {
      // Get from database
      participants = await this.participantRepository.find({
        where: { conversationId },
        relations: ['user'],
      });
      
      // Cache for 2 minutes
      await this.cacheManager.set(cacheKey, participants, 120000);
    }
    
    return participants;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<Conversation> {
    const cacheKey = `conversation:${conversationId}`;
    
    // Check cache first
    let conversation = await this.cacheManager.get<Conversation>(cacheKey);
    
    if (!conversation) {
      // Get from database
      conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
        relations: ['participants', 'participants.user'],
      });
      
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, conversation, 300000);
    }
    
    return conversation;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    creatorId: string,
    type: ConversationType,
    participantIds: string[],
    name?: string,
    description?: string,
  ): Promise<Conversation> {
    // Include creator in participants
    const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
    
    // Create conversation
    const conversation = this.conversationRepository.create({
      type,
      name,
      description,
      createdBy: creatorId,
    });
    
    const savedConversation = await this.conversationRepository.save(conversation);
    
    // Create participants
    const participants = allParticipantIds.map((userId, index) => {
      return this.participantRepository.create({
        conversationId: savedConversation.id,
        userId,
        role: index === 0 ? ParticipantRole.OWNER : ParticipantRole.MEMBER, // Creator is owner
        status: ParticipantStatus.ACTIVE,
        joinedAt: new Date(),
      });
    });
    
    await this.participantRepository.save(participants);
    
    // Clear caches
    for (const userId of allParticipantIds) {
      await this.cacheManager.del(`user-conversations:${userId}`);
    }
    
   
    
    return savedConversation;
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    addedBy: string,
  ): Promise<ConversationParticipant> {
    // Verify conversation exists
    const conversation = await this.getConversationById(conversationId);
    
    // Check if user can add participants
    const addingParticipant = await this.participantRepository.findOne({
      where: { conversationId, userId: addedBy },
    });
    
    if (!addingParticipant?.canPerformAction('add_member')) {
      throw new ForbiddenException('Permission denied to add participants');
    }
    
    // Check if user is already a participant
    const existingParticipant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });
    
    if (existingParticipant) {
      if (existingParticipant.status === ParticipantStatus.ACTIVE) {
        throw new ForbiddenException('User is already a participant');
      } else {
        // Reactivate participant
        existingParticipant.rejoin();
        await this.participantRepository.save(existingParticipant);
        
        // Clear caches
        await this.clearParticipantCaches(conversationId, userId);
        
        return existingParticipant;
      }
    }
    
    // Create new participant
    const participant = this.participantRepository.create({
      conversationId,
      userId,
      status: ParticipantStatus.ACTIVE,
      invitedBy: addedBy,
      joinedAt: new Date(),
    });
    
    const savedParticipant = await this.participantRepository.save(participant);
    
    // Clear caches
    await this.clearParticipantCaches(conversationId, userId);
    
    
    return savedParticipant;
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    // Check if user can remove participants
    const removingParticipant = await this.participantRepository.findOne({
      where: { conversationId, userId: removedBy },
    });
    
    if (!removingParticipant?.canPerformAction('remove_member')) {
      throw new ForbiddenException('Permission denied to remove participants');
    }
    
    // Find participant to remove
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });
    
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    
    // Remove participant
    participant.remove();
    await this.participantRepository.save(participant);
    
    // Clear caches
    await this.clearParticipantCaches(conversationId, userId);

  }

  /**
   * Update conversation settings
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation> {
    // Check permissions
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });
    
    if (!participant?.canPerformAction('edit_settings')) {
      throw new ForbiddenException('Permission denied to edit conversation');
    }
    
    // Update conversation
    await this.conversationRepository.update(conversationId, {
      ...updates,
      updatedAt: new Date(),
    });
    
    // Clear cache
    await this.cacheManager.del(`conversation:${conversationId}`);
    
    // Get updated conversation
    const updatedConversation = await this.getConversationById(conversationId);
    

    
    return updatedConversation;
  }

  /**
   * Clear participant-related caches
   */
  private async clearParticipantCaches(conversationId: string, userId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(`participants:${conversationId}`),
      this.cacheManager.del(`user-conversations:${userId}`),
      this.cacheManager.del(`access:${conversationId}:${userId}`),
      this.cacheManager.del(`participant:${conversationId}:${userId}`),
    ]);
  }
}
