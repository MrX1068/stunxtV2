import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Space, SpaceType, SpaceStatus, SpaceCategory, SpaceInteractionType } from '../../shared/entities/space.entity';
import { SpaceMember, SpaceMemberRole } from '../../shared/entities/space-member.entity';
import { Community } from '../../shared/entities/community.entity';
import { User } from '../../shared/entities/user.entity';
import { Conversation, ConversationType } from '../../shared/entities/conversation.entity';
import { PostType } from '../../shared/entities/post.entity';
import { CommunityMemberService } from '../community/community-member.service';
import { CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { SafeUserDto, SpaceMemberResponseDto } from '../../shared/dto/response.dto';
import { MessageService } from '../../messaging/message.service';
import { ConversationService } from '../../messaging/conversation.service';
import { PostService } from '../../posts/post.service';

export interface CreateSpaceDto {
  name: string;
  description?: string;
  type: SpaceType;
  interactionType?: SpaceInteractionType;
  category?: SpaceCategory;
  maxMembers?: number;
  allowPosting?: boolean;
  allowComments?: boolean;
  requireApproval?: boolean;
  restrictPostingToAdmins?: boolean;
  disableChat?: boolean;
  allowMemberInteractions?: boolean;
  tags?: string[];
  avatarUrl?: string;
  coverImageUrl?: string;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  category?: SpaceCategory;
  type?: SpaceType;
  interactionType?: SpaceInteractionType;
  maxMembers?: number;
  allowPosting?: boolean;
  allowComments?: boolean;
  requireApproval?: boolean;
  restrictPostingToAdmins?: boolean;
  disableChat?: boolean;
  allowMemberInteractions?: boolean;
  tags?: string[];
  avatarUrl?: string;
  coverImageUrl?: string;
  status?: SpaceStatus;
}

export interface SpaceQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  type?: SpaceType;
  status?: SpaceStatus;
  category?: SpaceCategory;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
  sortOrder?: 'ASC' | 'DESC';
  isPrivate?: boolean;
  communityId?: string;
}

@Injectable()
export class SpaceService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly communityMemberService: CommunityMemberService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly postService: PostService,
  ) {}

  async create(createSpaceDto: CreateSpaceDto, communityId: string, createdBy: string): Promise<any> {
    // Check if community exists
    const community = await this.communityRepository.findOne({
      where: { id: communityId }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if user has permission to create spaces in this community
    // Only community owners and admins can create spaces
    const hasPermission = await this.communityMemberService.checkMemberPermissions(
      communityId,
      createdBy,
      CommunityMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('Only community owners and admins can create spaces');
    }

    // Check if space name is unique within the community  
    const existingSpace = await this.spaceRepository.findOne({
      where: { 
        communityId,
        name: createSpaceDto.name 
      }
    });

    if (existingSpace) {
      throw new ConflictException('Space name already exists in this community');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createdBy }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create space
    const space = this.spaceRepository.create({
      ...createSpaceDto,
      communityId,
      ownerId: createdBy,
      status: SpaceStatus.ACTIVE,
      memberCount: 1,
    });

    const savedSpace = await this.spaceRepository.save(space) as Space;

    // Create space member for creator
    const spaceMember = this.spaceMemberRepository.create({
      spaceId: savedSpace.id,
      userId: createdBy,
      role: SpaceMemberRole.OWNER,
      joinedAt: new Date(),
      joinMethod: 'created',
    });

    await this.spaceMemberRepository.save(spaceMember);

    // Update community space count
    await this.communityRepository.increment(
      { id: communityId },
      'spaceCount',
      1
    );

    // Return the created space with safe transformation
    return this.findOne(savedSpace.id, createdBy);
  }

  async findAll(query: SpaceQueryDto, userId?: string): Promise<{ spaces: any[]; total: number }> {
    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.community', 'community')
      .leftJoinAndSelect('community.owner', 'communityOwner')
      .leftJoinAndSelect('space.owner', 'spaceOwner')
      .where('space.status = :status', { status: SpaceStatus.ACTIVE });

    // Filter by access - only show public spaces unless user has access
    if (!userId) {
      // Anonymous users can only see public spaces
      queryBuilder.andWhere('space.type = :publicType', { publicType: SpaceType.PUBLIC });
    } else {
      // Authenticated users can see public spaces + private/secret spaces they're members of
      queryBuilder.andWhere(
        '(space.type = :publicType OR EXISTS (' +
        'SELECT 1 FROM space_members sm WHERE sm.spaceId = space.id AND sm.userId = :userId' +
        '))',
        { publicType: SpaceType.PUBLIC, userId }
      );
    }

    // Apply filters
    if (query.communityId) {
      queryBuilder.andWhere('space.communityId = :communityId', { 
        communityId: query.communityId 
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(space.name ILIKE :search OR space.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.type) {
      queryBuilder.andWhere('space.type = :type', { type: query.type });
    }

    if (query.status) {
      queryBuilder.andWhere('space.status = :status', { status: query.status });
    }

    if (query.category) {
      queryBuilder.andWhere('space.category = :category', { category: query.category });
    }

    if (query.isPrivate !== undefined) {
      // Convert isPrivate boolean to SpaceType enum
      const targetType = query.isPrivate ? SpaceType.PRIVATE : SpaceType.PUBLIC;
      queryBuilder.andWhere('space.type = :spaceType', { 
        spaceType: targetType 
      });
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere('space.tags && :tags', { tags: query.tags });
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`space.${sortBy}`, sortOrder);

    // Apply pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [rawSpaces, total] = await queryBuilder.getManyAndCount();

    // Transform spaces to safely include user data
    const spaces = rawSpaces.map(space => ({
      ...space,
      owner: space.owner ? plainToClass(SafeUserDto, space.owner, { excludeExtraneousValues: true }) : null,
      community: space.community ? {
        ...space.community,
        owner: space.community.owner ? plainToClass(SafeUserDto, space.community.owner, { excludeExtraneousValues: true }) : null,
      } : null,
    }));

    return { spaces, total };
  }

  async findOne(id: string, userId?: string): Promise<any> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['community', 'community.owner', 'owner', 'members', 'members.user']
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check access permissions for private/secret spaces
    if (space.type !== SpaceType.PUBLIC && userId) {
      const membership = await this.spaceMemberRepository.findOne({
        where: { spaceId: id, userId }
      });

      if (!membership && space.type === SpaceType.SECRET) {
        throw new NotFoundException('Space not found'); // Hide existence for secret spaces
      }

      if (!membership && space.type === SpaceType.PRIVATE) {
        throw new ForbiddenException('Access denied to private space');
      }
    } else if (space.type !== SpaceType.PUBLIC && !userId) {
      // Non-public space accessed without user context
      if (space.type === SpaceType.SECRET) {
        throw new NotFoundException('Space not found');
      } else {
        throw new ForbiddenException('Authentication required to access this space');
      }
    }

    return this.transformSpaceResponse(space);
  }

  async findByName(communityId: string, name: string, userId?: string): Promise<any> {
    const space = await this.spaceRepository.findOne({
      where: { communityId, name },
      relations: ['community', 'community.owner', 'owner', 'members', 'members.user']
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Use the same access control as findOne
    return this.findOne(space.id, userId);
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto, updatedBy: string): Promise<any> {
    const space = await this.spaceRepository.findOne({
      where: { id }
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if user has permission to update this space
    const hasPermission = await this.hasSpacePermission(
      id,
      updatedBy,
      SpaceMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this space');
    }

    // Update space
    Object.assign(space, updateSpaceDto);
    space.updatedAt = new Date();

    await this.spaceRepository.save(space);

    // Return the updated space with safe transformation
    return this.findOne(id, updatedBy);
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    const space = await this.spaceRepository.findOne({
      where: { id }
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if user has permission to delete this space
    const hasPermission = await this.hasSpacePermission(
      id,
      deletedBy,
      SpaceMemberRole.OWNER
    );

    if (!hasPermission) {
      throw new ForbiddenException('Only space owner can delete the space');
    }

    // Soft delete space
    await this.spaceRepository.softDelete(id);

    // Update community space count
    await this.communityRepository.decrement(
      { id: space.communityId },
      'spaceCount',
      1
    );
  }

  async getCommunitySpaces(
    communityId: string,
    userId?: string,
    options?: {
      page?: number;
      limit?: number;
      includePrivate?: boolean;
    }
  ): Promise<{ spaces: any[]; total: number }> {
    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.owner', 'owner')
      .where('space.communityId = :communityId', { communityId })
      .andWhere('space.status = :status', { status: SpaceStatus.ACTIVE });

    // Filter private spaces based on user membership
    if (!options?.includePrivate || !userId) {
      queryBuilder.andWhere('space.type = :publicType', { publicType: SpaceType.PUBLIC });
    } else if (userId) {
      // Include private spaces if user is a member
      queryBuilder.andWhere(
        '(space.type = :publicType OR EXISTS (' +
        'SELECT 1 FROM space_members sm WHERE sm.space_id = space.id AND sm.user_id = :userId' +
        '))',
        { publicType: SpaceType.PUBLIC, userId }
      );
    }

    // Apply pagination
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy('space.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [rawSpaces, total] = await queryBuilder.getManyAndCount();

    // Transform spaces to safely include user data
    const spaces = rawSpaces.map(space => ({
      ...space,
      owner: space.owner ? plainToClass(SafeUserDto, space.owner, { excludeExtraneousValues: true }) : null,
    }));

    return { spaces, total };
  }

  async hasSpacePermission(
    spaceId: string,
    userId: string,
    requiredRole: SpaceMemberRole
  ): Promise<boolean> {
    const spaceMember = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId }
    });

    if (!spaceMember || spaceMember.isBanned()) {
      return false;
    }

    // Define role hierarchy (higher number = more permissions)
    const roleHierarchy = {
      [SpaceMemberRole.MEMBER]: 1,
      [SpaceMemberRole.MODERATOR]: 2,
      [SpaceMemberRole.ADMIN]: 3,
      [SpaceMemberRole.OWNER]: 4,
    };

    return roleHierarchy[spaceMember.role] >= roleHierarchy[requiredRole];
  }

  async getSpaceStats(spaceId: string): Promise<any> {
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId }
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    const memberStats = await this.spaceMemberRepository
      .createQueryBuilder('member')
      .select([
        'COUNT(*) as totalMembers',
        'COUNT(CASE WHEN member.role = :owner THEN 1 END) as owners',
        'COUNT(CASE WHEN member.role = :admin THEN 1 END) as admins',
        'COUNT(CASE WHEN member.role = :moderator THEN 1 END) as moderators',
        'COUNT(CASE WHEN member.role = :member THEN 1 END) as members',
      ])
      .where('member.spaceId = :spaceId', { spaceId })
      .setParameters({
        owner: SpaceMemberRole.OWNER,
        admin: SpaceMemberRole.ADMIN,
        moderator: SpaceMemberRole.MODERATOR,
        member: SpaceMemberRole.MEMBER,
      })
      .getRawOne();

    return {
      totalMembers: parseInt(memberStats.totalMembers),
      roleDistribution: {
        owners: parseInt(memberStats.owners),
        admins: parseInt(memberStats.admins),
        moderators: parseInt(memberStats.moderators),
        members: parseInt(memberStats.members),
      },
    };
  }

  async searchSpaces(
    query: string,
    communityId?: string,
    options?: {
      page?: number;
      limit?: number;
      includePrivate?: boolean;
      userId?: string;
    }
  ): Promise<{ spaces: any[]; total: number }> {
    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.community', 'community')
      .leftJoinAndSelect('community.owner', 'communityOwner')
      .leftJoinAndSelect('space.owner', 'spaceOwner')
      .where('space.status = :status', { status: SpaceStatus.ACTIVE })
      .andWhere(
        '(space.name ILIKE :query OR space.description ILIKE :query OR :query = ANY(space.tags))',
        { query: `%${query}%` }
      );

    if (communityId) {
      queryBuilder.andWhere('space.communityId = :communityId', { communityId });
    }

    // Handle private spaces
    if (!options?.includePrivate || !options?.userId) {
      queryBuilder.andWhere('space.type = :publicType', { publicType: SpaceType.PUBLIC });
    } else if (options.userId) {
      queryBuilder.andWhere(
        '(space.type = :publicType OR EXISTS (' +
        'SELECT 1 FROM space_members sm WHERE sm.space_id = space.id AND sm.user_id = :userId' +
        '))',
        { publicType: SpaceType.PUBLIC, userId: options.userId }
      );
    }

    // Apply pagination
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy('space.memberCount', 'DESC')
      .addOrderBy('space.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [rawSpaces, total] = await queryBuilder.getManyAndCount();

    // Transform spaces to safely include user data
    const spaces = rawSpaces.map(space => ({
      ...space,
      owner: space.owner ? plainToClass(SafeUserDto, space.owner, { excludeExtraneousValues: true }) : null,
      community: space.community ? {
        ...space.community,
        owner: space.community.owner ? plainToClass(SafeUserDto, space.community.owner, { excludeExtraneousValues: true }) : null,
      } : null,
    }));

    return { spaces, total };
  }

  async getPopularSpaces(
    communityId?: string,
    options?: {
      limit?: number;
      days?: number;
      includePrivate?: boolean;
      userId?: string;
    }
  ): Promise<any[]> {
    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.community', 'community')
      .leftJoinAndSelect('community.owner', 'communityOwner')
      .leftJoinAndSelect('space.owner', 'spaceOwner')
      .where('space.status = :status', { status: SpaceStatus.ACTIVE });

    if (communityId) {
      queryBuilder.andWhere('space.communityId = :communityId', { communityId });
    }

    // Handle private spaces
    if (!options?.includePrivate || !options?.userId) {
      queryBuilder.andWhere('space.type = :publicType', { publicType: SpaceType.PUBLIC });
    }

    const limit = Math.min(options?.limit || 10, 50);

    queryBuilder
      .orderBy('space.memberCount', 'DESC')
      .addOrderBy('space.createdAt', 'DESC')
      .take(limit);

    const rawSpaces = await queryBuilder.getMany();

    // Transform spaces to safely include user data
    return rawSpaces.map(space => ({
      ...space,
      owner: space.owner ? plainToClass(SafeUserDto, space.owner, { excludeExtraneousValues: true }) : null,
      community: space.community ? {
        ...space.community,
        owner: space.community.owner ? plainToClass(SafeUserDto, space.community.owner, { excludeExtraneousValues: true }) : null,
      } : null,
    }));
  }

  async getUserOwnedSpaces(
    userId: string, 
    communityId?: string, 
    options: { page?: number; limit?: number } = {}
  ): Promise<{ spaces: Space[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.spaceRepository.createQueryBuilder('space')
      .where('space.ownerId = :userId', { userId });

    if (communityId) {
      queryBuilder.andWhere('space.communityId = :communityId', { communityId });
    }

    queryBuilder
      .orderBy('space.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [spaces, total] = await queryBuilder.getManyAndCount();

    return {
      spaces,
      total,
      page,
      limit,
    };
  }

  // Helper method to safely transform space data
  private transformSpaceResponse(space: Space): any {
    const response = {
      ...space,
      owner: space.owner ? plainToClass(SafeUserDto, space.owner, { excludeExtraneousValues: true }) : null,
      community: space.community ? {
        ...space.community,
        owner: space.community.owner ? plainToClass(SafeUserDto, space.community.owner, { excludeExtraneousValues: true }) : null,
      } : null,
      members: space.members ? space.members.map(member => ({
        ...plainToClass(SpaceMemberResponseDto, member, { excludeExtraneousValues: true }),
        user: plainToClass(SafeUserDto, member.user, { excludeExtraneousValues: true })
      })) : []
    };
    return response;
  }

  // Create default spaces for a new community
  async createDefaultSpaces(communityId: string, createdBy: string): Promise<void> {
    try {
      // 1. Create Announcements Space (Post-style, admin-only posting)
      const announcementsSpace: CreateSpaceDto = {
        name: 'Announcements',
        description: 'Official announcements and updates from community leaders',
        type: SpaceType.PUBLIC,
        interactionType: SpaceInteractionType.POST,
        category: SpaceCategory.ANNOUNCEMENTS,
        restrictPostingToAdmins: true,    // Only admins can post
        disableChat: true,                // No chat functionality
        allowMemberInteractions: true,    // Members can react/comment
        requireApproval: false,
        allowPosting: true,
        allowComments: true,
        maxMembers: 10000,
        tags: ['announcements', 'official']
      };

      // 2. Create General Discussion Space (Chat-style, interactive)
      const generalSpace: CreateSpaceDto = {
        name: 'General Discussion',
        description: 'Open discussion for all community members',
        type: SpaceType.PUBLIC,
        interactionType: SpaceInteractionType.CHAT,
        category: SpaceCategory.GENERAL,
        restrictPostingToAdmins: false,   // Everyone can post
        disableChat: false,               // Full chat functionality
        allowMemberInteractions: true,    // Full interactions
        requireApproval: false,
        allowPosting: true,
        allowComments: true,
        maxMembers: 10000,
        tags: ['general', 'discussion', 'chat']
      };

      // Create both spaces
      await this.create(announcementsSpace, communityId, createdBy);
      await this.create(generalSpace, communityId, createdBy);

      console.log(`✅ Default spaces created for community ${communityId}`);
    } catch (error) {
      console.error(`❌ Failed to create default spaces for community ${communityId}:`, error);
      // Don't throw error to prevent community creation from failing
    }
  }

  // ==================== SECURE SPACE CONTENT METHODS ====================

  /**
   * Get space content based on interaction type (posts or messages)
   */
  async getSpaceContent(
    spaceId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      contentType?: 'posts' | 'messages';
      before?: string;
      after?: string;
    } = {}
  ): Promise<any> {
    console.log('🔵 [SpaceService] getSpaceContent called');
    console.log('🔵 [SpaceService] Params:', { spaceId, userId, options });
    
    try {
      const space = await this.findOne(spaceId);
      console.log('🔵 [SpaceService] Found space:', { id: space?.id, name: space?.name, interactionType: space?.interactionType });
      
      if (!space) {
        console.error('❌ [SpaceService] Space not found for ID:', spaceId);
        throw new NotFoundException('Space not found');
      }

      // Determine content type based on space interaction type or override
      const contentType = options.contentType || 
        (space.interactionType === SpaceInteractionType.CHAT ? 'messages' : 'posts');
      console.log('🔵 [SpaceService] Determined content type:', contentType);

      if (contentType === 'messages') {
        console.log('🔵 [SpaceService] Fetching messages for chat space');
        const result = await this.getSpaceMessages(spaceId, userId, options);
        console.log('✅ [SpaceService] Messages retrieved:', { count: result?.messages?.length || 0 });
        return result;
      } else {
        console.log('🔵 [SpaceService] Fetching posts for post space');
        const result = await this.getSpacePosts(spaceId, userId, options);
        console.log('✅ [SpaceService] Posts retrieved:', { count: result?.posts?.length || 0 });
        return result;
      }
    } catch (error) {
      console.error('❌ [SpaceService] Error in getSpaceContent:', error);
      throw error;
    }
  }

  /**
   * Create content in space (post or message based on interaction type)
   */
  async createSpaceContent(
    spaceId: string,
    userId: string,
    contentData: any
  ): Promise<any> {
    console.log('🟡 [SpaceService] createSpaceContent called');
    console.log('🟡 [SpaceService] Params:', { spaceId, userId, contentData });
    
    try {
      const space = await this.findOne(spaceId);
      console.log('🟡 [SpaceService] Found space:', { id: space?.id, name: space?.name, interactionType: space?.interactionType });
      
      if (!space) {
        console.error('❌ [SpaceService] Space not found for ID:', spaceId);
        throw new NotFoundException('Space not found');
      }

      if (space.interactionType === SpaceInteractionType.CHAT) {
        console.log('🟡 [SpaceService] Creating message for chat space');
        const result = await this.sendSpaceMessage(spaceId, userId, contentData);
        console.log('✅ [SpaceService] Message created successfully');
        return result;
      } else {
        console.log('🟡 [SpaceService] Creating post for post space');
        const result = await this.createSpacePost(spaceId, userId, contentData);
        console.log('✅ [SpaceService] Post created successfully');
        return result;
      }
    } catch (error) {
      console.error('❌ [SpaceService] Error in createSpaceContent:', error);
      throw error;
    }
  }

  /**
   * Get messages for chat spaces
   */
  async getSpaceMessages(
    spaceId: string,
    userId: string,
    options: {
      limit?: number;
      before?: string;
      after?: string;
    } = {}
  ): Promise<any> {
    console.log('💬 [SpaceService] getSpaceMessages called');
    console.log('💬 [SpaceService] Params:', { spaceId, userId, options });
    
    try {
      const space = await this.findOne(spaceId);
      console.log('💬 [SpaceService] Found space:', { id: space?.id, name: space?.name, interactionType: space?.interactionType });
      
      if (!space) {
        console.error('❌ [SpaceService] Space not found for ID:', spaceId);
        throw new NotFoundException('Space not found');
      }

      if (space.interactionType !== SpaceInteractionType.CHAT) {
        console.error('❌ [SpaceService] Space is not a chat space:', space.interactionType);
        throw new BadRequestException('This space does not support messages');
      }

      // Find or create space conversation
      let conversation = await this.conversationRepository.findOne({
        where: { spaceId },
        relations: ['space'],
      });
      console.log('💬 [SpaceService] Found conversation:', { id: conversation?.id, exists: !!conversation });

      if (!conversation) {
        console.log('💬 [SpaceService] Auto-creating conversation for chat space');
        // Auto-create conversation for chat spaces if it doesn't exist
        conversation = await this.conversationService.createConversation(
          userId,
          ConversationType.SPACE,
          [], // No additional participants initially
          space.name,
        `Chat for space: ${space.name}`
      );
      console.log('✅ [SpaceService] Conversation created:', conversation.id);
      
      // Link conversation to space (update conversation with spaceId)
      await this.conversationRepository.update(conversation.id, { spaceId });
      
      // Reload conversation with relations
      conversation = await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['space'],
      });
      console.log('💬 [SpaceService] Conversation linked to space');
    }

    console.log('💬 [SpaceService] Getting messages from space conversation...');
    
    // Use space conversation format for message service to handle it properly
    const spaceConversationId = `space-${conversation.id}`;
    console.log('🔧 [SpaceService] Using space conversation format:', {
      originalId: conversation.id,
      spaceConversationId
    });
    
    // Get messages via message service using space conversation format
    const result = await this.messageService.getMessages(
      spaceConversationId,  // ✅ Use space-{uuid} format
      userId,
      options.limit || 50,
      options.before,
      options.after
    );
    console.log('✅ [SpaceService] Messages retrieved:', { count: result?.messages?.length || 0 });
    return result;
    } catch (error) {
      console.error('❌ [SpaceService] Error in getSpaceMessages:', error);
      throw error;
    }
  }

  /**
   * Get or create conversation for space chat
   */
  async getOrCreateSpaceConversation(
    spaceId: string,
    userId: string,
    spaceName?: string
  ): Promise<string> {
    console.log('🟡 [SpaceService] getOrCreateSpaceConversation called');
    console.log('🟡 [SpaceService] Params:', { spaceId, userId, spaceName });
    
    try {
      const space = await this.findOne(spaceId);
      console.log('🟡 [SpaceService] Found space:', { id: space?.id, name: space?.name, interactionType: space?.interactionType });
      
      if (!space) {
        console.error('❌ [SpaceService] Space not found for ID:', spaceId);
        throw new NotFoundException('Space not found');
      }

      // Find existing conversation for this space
      let conversation = await this.conversationRepository.findOne({
        where: { spaceId },
      });

      if (conversation) {
        console.log('✅ [SpaceService] Found existing conversation:', conversation.id);
        return conversation.id;
      }

      // Create new conversation for the space
      console.log('🟡 [SpaceService] Creating new space conversation');
      conversation = await this.conversationService.createConversation(
        userId,
        ConversationType.SPACE,
        [], // No additional participants initially - space members will join as needed
        spaceName || space.name,
        `Chat for space: ${space.name}`
      );
      
      // Link conversation to space
      await this.conversationRepository.update(conversation.id, { spaceId });
      console.log('✅ [SpaceService] Created and linked conversation:', conversation.id);

      return conversation.id;
    } catch (error) {
      console.error('❌ [SpaceService] Error in getOrCreateSpaceConversation:', error);
      throw error;
    }
  }

  /**
   * Send message to chat space
   */
  async sendSpaceMessage(
    spaceId: string,
    userId: string,
    messageData: any
  ): Promise<any> {
    console.log('🟡 [SpaceService] sendSpaceMessage called');
    console.log('🟡 [SpaceService] Params:', { spaceId, userId, messageType: messageData.type });
    
    const space = await this.findOne(spaceId);
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Use the new method to get or create conversation
    const conversationId = await this.getOrCreateSpaceConversation(spaceId, userId, space.name);

    // Send message
    console.log('🟡 [SpaceService] Sending message to conversation:', conversationId);
    const result = await this.messageService.sendMessage(userId, {
      conversationId,
      content: messageData.content,
      type: messageData.type || 'text'
    });

    console.log('✅ [SpaceService] Space message sent successfully');
    return result;
  }

  /**
   * Get posts for post/forum/feed spaces
   */
  async getSpacePosts(
    spaceId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
    } = {}
  ): Promise<any> {
    console.log('📝 [SpaceService] getSpacePosts called');
    console.log('📝 [SpaceService] Params:', { spaceId, userId, options });
    
    try {
      const space = await this.findOne(spaceId);
      console.log('📝 [SpaceService] Found space:', { id: space?.id, name: space?.name, interactionType: space?.interactionType });
      
      if (!space) {
        console.error('❌ [SpaceService] Space not found for ID:', spaceId);
        throw new NotFoundException('Space not found');
      }

      const supportedTypes = [
        SpaceInteractionType.POST,
        SpaceInteractionType.FORUM,
        SpaceInteractionType.FEED
      ];

      if (!supportedTypes.includes(space.interactionType)) {
        console.error('❌ [SpaceService] Space does not support posts:', space.interactionType);
        throw new BadRequestException('This space does not support posts');
      }

      console.log('📝 [SpaceService] Calling PostService.getSpacePosts');
      // Use existing post service
      const result = await this.postService.getSpacePosts(spaceId, userId, {
        limit: options.limit || 20,
        offset: options.offset || 0,
        sortBy: options.sortBy || 'createdAt',
      });
      console.log('✅ [SpaceService] Posts retrieved via PostService:', { count: result?.posts?.length || 0 });
      return result;
    } catch (error) {
      console.error('❌ [SpaceService] Error in getSpacePosts:', error);
      throw error;
    }
  }

  /**
   * Create post in space
   */
  async createSpacePost(
    spaceId: string,
    userId: string,
    postData: any
  ): Promise<any> {
    const space = await this.findOne(spaceId);
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    const supportedTypes = [
      SpaceInteractionType.POST,
      SpaceInteractionType.FORUM,
      SpaceInteractionType.FEED
    ];

    if (!supportedTypes.includes(space.interactionType)) {
      throw new BadRequestException('This space does not support posts');
    }

    // Validate and set post type
    let postType = PostType.TEXT; // Default to TEXT
    if (postData.type && Object.values(PostType).includes(postData.type)) {
      postType = postData.type;
    }

    console.log('📝 [SpaceService] Creating post with type:', postType);

    // Create post via post service
    return this.postService.createPost(userId, {
      ...postData,
      type: postType,
      spaceId,
      communityId: space.communityId,
    });
  }

  /**
   * Auto-create conversation when creating chat spaces
   */
  private async createSpaceConversation(space: Space, userId: string): Promise<Conversation> {
    const conversation = await this.conversationService.createConversation(
      userId,
      ConversationType.SPACE,
      [], // No additional participants initially
      space.name,
      `Chat for space: ${space.name}`
    );
    
    // Link conversation to space (update conversation with spaceId)
    await this.conversationRepository.update(conversation.id, { spaceId: space.id });
    
    return conversation;
  }

  /**
   * Enhanced create method with auto-conversation creation
   */
}
