import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Space, SpaceType, SpaceStatus, SpaceCategory, SpaceInteractionType } from '../../shared/entities/space.entity';
import { SpaceMember, SpaceMemberRole } from '../../shared/entities/space-member.entity';
import { Community } from '../../shared/entities/community.entity';
import { User } from '../../shared/entities/user.entity';
import { CommunityMemberService } from '../community/community-member.service';
import { CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { SafeUserDto, SpaceMemberResponseDto } from '../../shared/dto/response.dto';

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
    private readonly communityMemberService: CommunityMemberService,
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
}
