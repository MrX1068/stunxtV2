import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Community, CommunityType, CommunityStatus, JoinRequirement } from '../../shared/entities/community.entity';
import { CommunityMember, CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { User } from '../../shared/entities/user.entity';
import { Space, SpaceType, SpaceStatus, SpaceCategory, SpaceInteractionType } from '../../shared/entities/space.entity';
import { SpaceMember, SpaceMemberRole } from '../../shared/entities/space-member.entity';
import { CommunityAuditService } from './community-audit.service';
import { CreateCommunityDto, UpdateCommunityDto, CommunityQueryDto } from './dto/community.dto';
import { SafeUserDto, CommunityMemberResponseDto } from '../../shared/dto/response.dto';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly memberRepository: Repository<CommunityMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    private readonly auditService: CommunityAuditService,
  ) {}

  async create(createCommunityDto: CreateCommunityDto, ownerId: string): Promise<Community> {
    // Verify owner exists
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    // Auto-generate unique slug from name
    const baseSlug = this.generateSlugFromName(createCommunityDto.name);
    const uniqueSlug = await this.generateUniqueSlug(baseSlug);

    // Set smart defaults based on community type
    const joinRequirement = createCommunityDto.type === CommunityType.PUBLIC 
      ? JoinRequirement.OPEN 
      : JoinRequirement.APPROVAL_REQUIRED;

    // Create community with auto-generated values and smart defaults
    const community = this.communityRepository.create({
      ...createCommunityDto,
      slug: uniqueSlug,
      joinRequirement,
      ownerId,
      memberCount: 1,
      // Set reasonable defaults
      allowInvites: true,
      allowMemberInvites: createCommunityDto.type === CommunityType.PUBLIC,
      allowSpaceCreation: true,
      maxMembers: 100000,
    });

    const savedCommunity = await this.communityRepository.save(community) as Community;

    // Create owner membership
    const ownerMember = this.memberRepository.create({
      communityId: savedCommunity.id,
      userId: ownerId,
      role: CommunityMemberRole.OWNER,
      joinedAt: new Date(),
      joinMethod: 'created',
    });

    await this.memberRepository.save(ownerMember);

    // Log audit event
    await this.auditService.logCommunityCreated(savedCommunity.id, ownerId, savedCommunity.name);

    // Create default spaces for the community
    await this.createDefaultSpaces(savedCommunity.id, ownerId);

    // Return the created community with safe transformation
    return this.findOne(savedCommunity.id, ownerId);
  }

  async findAll(query: CommunityQueryDto, userId?: string): Promise<{ communities: any[]; total: number }> {
    const queryBuilder = this.communityRepository.createQueryBuilder('community')
      .leftJoinAndSelect('community.owner', 'owner')
      .where('community.status = :status', { status: CommunityStatus.ACTIVE });

    // Filter by access - only show public communities unless user has access
    if (!userId) {
      // Anonymous users can only see public communities
      queryBuilder.andWhere('community.type = :publicType', { publicType: CommunityType.PUBLIC });
    } else {
      // Authenticated users can see public communities + private/secret communities they're members of
      queryBuilder.andWhere(
        '(community.type = :publicType OR EXISTS (' +
        'SELECT 1 FROM community_members cm WHERE cm.community_id = community.id AND cm.user_id = :userId' +
        '))',
        { publicType: CommunityType.PUBLIC, userId }
      );
    }

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('community.type = :type', { type: query.type });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(community.name ILIKE :search OR community.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.featured) {
      queryBuilder.andWhere('community.isFeatured = :featured', { featured: query.featured });
    }

    if (query.verified) {
      queryBuilder.andWhere('community.isPlatformVerified = :verified', { verified: query.verified });
    }

    // Apply sorting
    switch (query.sortBy) {
      case 'members':
        queryBuilder.orderBy('community.memberCount', query.sortOrder || 'DESC');
        break;
      case 'activity':
        queryBuilder.orderBy('community.messageCount', query.sortOrder || 'DESC');
        break;
      case 'created':
        queryBuilder.orderBy('community.createdAt', query.sortOrder || 'DESC');
        break;
      default:
        queryBuilder.orderBy('community.createdAt', 'DESC');
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [rawCommunities, total] = await queryBuilder.getManyAndCount();

    // Transform communities to safely include owner data
    const communities = rawCommunities.map(community => ({
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
    }));

    return { communities, total };
  }

  async findOne(id: string, userId?: string): Promise<any> {
    const community = await this.communityRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check access permissions for private/secret communities
    if (community.type !== CommunityType.PUBLIC && userId) {
      const membership = await this.memberRepository.findOne({
        where: { communityId: id, userId }
      });

      if (!membership && community.type === CommunityType.SECRET) {
        throw new NotFoundException('Community not found'); // Hide existence
      }

      if (!membership && community.type === CommunityType.PRIVATE) {
        throw new ForbiddenException('Access denied to private community');
      }
    }

    return this.transformCommunityResponse(community);
  }

  async findBySlug(slug: string, userId?: string): Promise<any> {
    const community = await this.communityRepository.findOne({
      where: { slug },
      relations: ['owner'],
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return this.findOne(community.id, userId);
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto, userId: string): Promise<any> {
    const community = await this.communityRepository.findOne({ where: { id } });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check permissions
    const membership = await this.memberRepository.findOne({
      where: { communityId: id, userId }
    });

    if (!membership || (!membership.isOwner() && !membership.isAdmin())) {
      throw new ForbiddenException('Insufficient permissions to update community');
    }

    // Check slug uniqueness if being updated
    if (updateCommunityDto.slug && updateCommunityDto.slug !== community.slug) {
      const existingCommunity = await this.communityRepository.findOne({
        where: { slug: updateCommunityDto.slug }
      });

      if (existingCommunity) {
        throw new ConflictException('Community slug already exists');
      }
    }

    // Track changes for audit
    const changes: Record<string, any> = {};
    Object.keys(updateCommunityDto).forEach(key => {
      if (community[key] !== updateCommunityDto[key]) {
        changes[key] = {
          before: community[key],
          after: updateCommunityDto[key],
        };
      }
    });

    // Update community
    Object.assign(community, updateCommunityDto);
    await this.communityRepository.save(community);

    // Log audit event
    if (Object.keys(changes).length > 0) {
      await this.auditService.logCommunityUpdated(id, userId, changes);
    }

    // Return updated community with safe transformation
    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const community = await this.findOne(id);

    // Only owner can delete community
    const membership = await this.memberRepository.findOne({
      where: { communityId: id, userId }
    });

    if (!membership || !membership.isOwner()) {
      throw new ForbiddenException('Only community owner can delete community');
    }

    // Soft delete
    await this.communityRepository.softDelete(id);

    // Log audit event
    await this.auditService.logCommunityDeleted(id, userId, community.name);
  }

  async getStats(id: string): Promise<any> {
    const community = await this.findOne(id);

    const stats = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoin('community.members', 'member')
      .leftJoin('community.spaces', 'space')
      .select([
        'COUNT(DISTINCT member.id) as memberCount',
        'COUNT(DISTINCT space.id) as spaceCount',
        'COUNT(DISTINCT CASE WHEN member.lastActivityAt > NOW() - INTERVAL \'24 hours\' THEN member.id END) as activeMembersToday',
        'COUNT(DISTINCT CASE WHEN member.lastActivityAt > NOW() - INTERVAL \'7 days\' THEN member.id END) as activeMembersWeek',
        'COUNT(DISTINCT CASE WHEN member.lastActivityAt > NOW() - INTERVAL \'30 days\' THEN member.id END) as activeMembersMonth',
      ])
      .where('community.id = :id', { id })
      .getRawOne();

    return {
      ...stats,
      messageCount: community.messageCount,
      createdAt: community.createdAt,
      type: community.type,
      status: community.status,
    };
  }

  async getUserCommunities(userId: string): Promise<any[]> {
    const communities = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.owner', 'owner')
      .innerJoin('community.members', 'member')
      .where('member.userId = :userId', { userId })
      .andWhere('member.status = :status', { status: 'active' })
      .orderBy('member.joinedAt', 'DESC')
      .getMany();

    // Transform communities to safely include owner data
    return communities.map(community => ({
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
    }));
  }

  async getRecommendedCommunities(userId?: string, limit: number = 10): Promise<any[]> {
    const queryBuilder = this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.owner', 'owner')
      .where('community.status = :status', { status: CommunityStatus.ACTIVE })
      .andWhere('community.type = :type', { type: CommunityType.PUBLIC });

    if (userId) {
      // Exclude communities user is already a member of
      queryBuilder.andWhere(`
        community.id NOT IN (
          SELECT member.community_id 
          FROM community_members member 
          WHERE member.user_id = :userId
        )
      `, { userId });
    }

    const communities = await queryBuilder
      .orderBy('community.memberCount', 'DESC')
      .addOrderBy('community.messageCount', 'DESC')
      .limit(limit)
      .getMany();

    // Transform communities to safely include owner data
    return communities.map(community => ({
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
    }));
  }

  async getTrendingCommunities(limit: number = 10): Promise<any[]> {
    const communities = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.owner', 'owner')
      .where('community.status = :status', { status: CommunityStatus.ACTIVE })
      .andWhere('community.type = :type', { type: CommunityType.PUBLIC })
      .orderBy('community.activeMembersToday', 'DESC')
      .addOrderBy('community.messageCount', 'DESC')
      .limit(limit)
      .getMany();

    // Transform communities to safely include owner data
    return communities.map(community => ({
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
    }));
  }

  async validateSlug(slug: string): Promise<boolean> {
    const existing = await this.communityRepository.findOne({
      where: { slug },
      select: ['id']
    });
    return !existing;
  }

  async incrementMemberCount(communityId: string): Promise<void> {
    await this.communityRepository.increment({ id: communityId }, 'memberCount', 1);
  }

  async decrementMemberCount(communityId: string): Promise<void> {
    await this.communityRepository.decrement({ id: communityId }, 'memberCount', 1);
  }

  async incrementSpaceCount(communityId: string): Promise<void> {
    await this.communityRepository.increment({ id: communityId }, 'spaceCount', 1);
  }

  async decrementSpaceCount(communityId: string): Promise<void> {
    await this.communityRepository.decrement({ id: communityId }, 'spaceCount', 1);
  }

  async incrementMessageCount(communityId: string): Promise<void> {
    await this.communityRepository.increment({ id: communityId }, 'messageCount', 1);
  }

  async getUserOwnedCommunities(userId: string, options: { page?: number; limit?: number } = {}): Promise<{ communities: any[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [rawCommunities, total] = await this.communityRepository.findAndCount({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['owner'],
    });

    // Transform communities to safely include owner data
    const communities = rawCommunities.map(community => ({
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
    }));

    return {
      communities,
      total,
      page,
      limit,
    };
  }

  // Helper method to generate slug from name
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  // Helper method to generate unique slug
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Helper method to check if slug exists
  private async slugExists(slug: string): Promise<boolean> {
    const existing = await this.communityRepository.findOne({
      where: { slug },
      select: ['id']
    });
    return !!existing;
  }

  // Helper method to safely transform community data
  private transformCommunityResponse(community: Community): any {
    const response = {
      ...community,
      owner: community.owner ? plainToClass(SafeUserDto, community.owner, { excludeExtraneousValues: true }) : null,
      members: community.members ? community.members.map(member => ({
        ...plainToClass(CommunityMemberResponseDto, member, { excludeExtraneousValues: true }),
        user: plainToClass(SafeUserDto, member.user, { excludeExtraneousValues: true })
      })) : []
    };
    return response;
  }

  // Create default spaces for a new community
  private async createDefaultSpaces(communityId: string, createdBy: string): Promise<void> {
    try {
      // 1. Create Announcements Space (Post-style, admin-only posting)
      const announcementsSpace = this.spaceRepository.create({
        name: 'Announcements',
        description: 'Official announcements and updates from community leaders',
        communityId,
        ownerId: createdBy,
        type: SpaceType.PUBLIC,
        interactionType: SpaceInteractionType.POST,
        category: SpaceCategory.ANNOUNCEMENTS,
        status: SpaceStatus.ACTIVE,
        restrictPostingToAdmins: true,    // Only admins can post
        disableChat: true,                // No chat functionality
        allowMemberInteractions: true,    // Members can react/comment
        requireApproval: false,
        maxMembers: 10000,
        memberCount: 1,
        tags: ['announcements', 'official']
      });

      const savedAnnouncementsSpace = await this.spaceRepository.save(announcementsSpace);

      // Create space member for announcements space
      const announcementsMember = this.spaceMemberRepository.create({
        spaceId: savedAnnouncementsSpace.id,
        userId: createdBy,
        role: SpaceMemberRole.OWNER,
        joinedAt: new Date(),
        joinMethod: 'created',
      });
      await this.spaceMemberRepository.save(announcementsMember);

      // 2. Create General Discussion Space (Chat-style, interactive)
      const generalSpace = this.spaceRepository.create({
        name: 'General Discussion',
        description: 'Open discussion for all community members',
        communityId,
        ownerId: createdBy,
        type: SpaceType.PUBLIC,
        interactionType: SpaceInteractionType.CHAT,
        category: SpaceCategory.GENERAL,
        status: SpaceStatus.ACTIVE,
        restrictPostingToAdmins: false,   // Everyone can post
        disableChat: false,               // Full chat functionality
        allowMemberInteractions: true,    // Full interactions
        requireApproval: false,
        maxMembers: 10000,
        memberCount: 1,
        tags: ['general', 'discussion', 'chat']
      });

      const savedGeneralSpace = await this.spaceRepository.save(generalSpace);

      // Create space member for general space
      const generalMember = this.spaceMemberRepository.create({
        spaceId: savedGeneralSpace.id,
        userId: createdBy,
        role: SpaceMemberRole.OWNER,
        joinedAt: new Date(),
        joinMethod: 'created',
      });
      await this.spaceMemberRepository.save(generalMember);

      // Update community space count
      await this.communityRepository.increment(
        { id: communityId },
        'spaceCount',
        2
      );

      console.log(`✅ Default spaces created for community ${communityId}`);
    } catch (error) {
      console.error(`❌ Failed to create default spaces for community ${communityId}:`, error);
      // Don't throw error to prevent community creation from failing
    }
  }
}
