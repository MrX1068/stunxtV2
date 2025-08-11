import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CommunityMember, CommunityMemberRole, CommunityMemberStatus } from '../../shared/entities/community-member.entity';
import { Community } from '../../shared/entities/community.entity';
import { User } from '../../shared/entities/user.entity';
import { CommunityAuditService } from './community-audit.service';
import { plainToClass } from 'class-transformer';
import { CommunityMemberResponseDto, SafeUserDto } from '../../shared/dto/response.dto';

@Injectable()
export class CommunityMemberService {
  constructor(
    @InjectRepository(CommunityMember)
    private readonly memberRepository: Repository<CommunityMember>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: CommunityAuditService,
  ) {}

  async addMember(
    communityId: string,
    userId: string,
    role: CommunityMemberRole = CommunityMemberRole.MEMBER,
    addedBy?: string,
    joinMethod: string = 'manual'
  ): Promise<CommunityMember> {
    // Check if user is already a member
    const existingMember = await this.memberRepository.findOne({
      where: { communityId, userId }
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this community');
    }

    // Verify community exists
    const community = await this.communityRepository.findOne({
      where: { id: communityId }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create member
    const member = this.memberRepository.create({
      communityId,
      userId,
      role,
      joinedAt: new Date(),
      joinMethod,
    });

    const savedMember = await this.memberRepository.save(member) as CommunityMember;

    // Update community member count
    await this.communityRepository.increment(
      { id: communityId }, 
      'memberCount', 
      1
    );

    // Log audit event
    await this.auditService.logMemberJoined(
      communityId,
      userId,
      addedBy,
      joinMethod
    );

    return savedMember;
  }

  async removeMember(
    communityId: string,
    userId: string,
    removedBy?: string,
    reason?: string
  ): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { communityId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove the owner
    if (member.role === CommunityMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove community owner');
    }

    await this.memberRepository.remove(member);

    // Update community member count
    await this.communityRepository.decrement(
      { id: communityId }, 
      'memberCount', 
      1
    );

    // Log audit event
    if (removedBy === userId) {
      await this.auditService.logMemberLeft(communityId, userId, reason);
    } else {
      await this.auditService.logMemberKicked(communityId, userId, removedBy!, reason);
    }
  }

  async updateMemberRole(
    communityId: string,
    userId: string,
    newRole: CommunityMemberRole,
    updatedBy: string
  ): Promise<CommunityMember> {
    const member = await this.memberRepository.findOne({
      where: { communityId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (member.role === CommunityMemberRole.OWNER || newRole === CommunityMemberRole.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    const oldRole = member.role;
    member.role = newRole;
    member.updatedAt = new Date();

    const updatedMember = await this.memberRepository.save(member) as CommunityMember;

    // Log audit event
    await this.auditService.logRoleChanged(
      communityId,
      userId,
      updatedBy,
      oldRole,
      newRole
    );

    return updatedMember;
  }

  async banMember(
    communityId: string,
    userId: string,
    bannedBy: string,
    reason?: string
  ): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { communityId, userId }
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot ban owner or admins
    if (member.role === CommunityMemberRole.OWNER || member.role === CommunityMemberRole.ADMIN) {
      throw new BadRequestException('Cannot ban community owner or admin');
    }

    member.status = CommunityMemberStatus.BANNED;
    member.updatedAt = new Date();

    await this.memberRepository.save(member);

    // Log audit event
    await this.auditService.logMemberBanned(communityId, userId, bannedBy, reason);
  }

  async unbanMember(
    communityId: string,
    userId: string,
    unbannedBy: string
  ): Promise<CommunityMember> {
    const member = await this.memberRepository.findOne({
      where: { communityId, userId }
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (!member.isBanned()) {
      throw new BadRequestException('Member is not banned');
    }

    member.status = CommunityMemberStatus.ACTIVE;
    member.updatedAt = new Date();

    const updatedMember = await this.memberRepository.save(member) as CommunityMember;

    // Log audit event (we need to add this action to audit service)
    // await this.auditService.logMemberUnbanned(communityId, userId, unbannedBy);

    return updatedMember;
  }

  async getMember(communityId: string, userId: string): Promise<CommunityMember | null> {
    return this.memberRepository.findOne({
      where: { communityId, userId },
      relations: ['user', 'community']
    });
  }

  async getMembers(
    communityId: string,
    options?: {
      page?: number;
      limit?: number;
      role?: CommunityMemberRole;
      search?: string;
      includeStats?: boolean;
    }
  ): Promise<{ members: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.communityId = :communityId', { communityId })
      .andWhere('member.status = :status', { status: CommunityMemberStatus.ACTIVE });

    if (options?.role) {
      queryBuilder.andWhere('member.role = :role', { role: options.role });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    queryBuilder.orderBy('member.joinedAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [members, total] = await queryBuilder.getManyAndCount();

    // Transform to safe response format using DTOs
    const safeMembers = members.map(member => ({
      ...plainToClass(CommunityMemberResponseDto, member, { excludeExtraneousValues: true }),
      user: member.user ? plainToClass(SafeUserDto, member.user, { excludeExtraneousValues: true }) : null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      members: safeMembers,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getMemberStats(communityId: string): Promise<any> {
    const stats = await this.memberRepository
      .createQueryBuilder('member')
      .select([
        'COUNT(*) as totalMembers',
        'COUNT(CASE WHEN member.role = :owner THEN 1 END) as owners',
        'COUNT(CASE WHEN member.role = :admin THEN 1 END) as admins',
        'COUNT(CASE WHEN member.role = :moderator THEN 1 END) as moderators',
        'COUNT(CASE WHEN member.role = :member THEN 1 END) as members',
        'COUNT(CASE WHEN member.role = :restricted THEN 1 END) as restricted',
        'COUNT(CASE WHEN member.isBanned = true THEN 1 END) as banned',
      ])
      .where('member.communityId = :communityId', { communityId })
      .setParameters({
        owner: CommunityMemberRole.OWNER,
        admin: CommunityMemberRole.ADMIN,
        moderator: CommunityMemberRole.MODERATOR,
        member: CommunityMemberRole.MEMBER,
        restricted: CommunityMemberRole.RESTRICTED,
      })
      .getRawOne();

    return {
      total: parseInt(stats.totalMembers),
      byRole: {
        owner: parseInt(stats.owners),
        admin: parseInt(stats.admins),
        moderator: parseInt(stats.moderators),
        member: parseInt(stats.members),
        restricted: parseInt(stats.restricted),
      },
      banned: parseInt(stats.banned),
    };
  }

  async getUserCommunities(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      role?: CommunityMemberRole;
    }
  ): Promise<{ memberships: CommunityMember[]; total: number }> {
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.community', 'community')
      .where('member.userId = :userId', { userId })
      .andWhere('member.status = :status', { status: CommunityMemberStatus.ACTIVE });

    if (options?.role) {
      queryBuilder.andWhere('member.role = :role', { role: options.role });
    }

    queryBuilder.orderBy('member.joinedAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [memberships, total] = await queryBuilder.getManyAndCount();

    return { memberships, total };
  }

  async checkMemberPermissions(
    communityId: string,
    userId: string,
    requiredRole: CommunityMemberRole
  ): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { communityId, userId }
    });

    if (!member || member.isBanned()) {
      return false;
    }

    // Role hierarchy: OWNER > ADMIN > MODERATOR > MEMBER > RESTRICTED
    const roleHierarchy = {
      [CommunityMemberRole.OWNER]: 5,
      [CommunityMemberRole.ADMIN]: 4,
      [CommunityMemberRole.MODERATOR]: 3,
      [CommunityMemberRole.MEMBER]: 2,
      [CommunityMemberRole.RESTRICTED]: 1,
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  async getActiveMemberCount(communityId: string): Promise<number> {
    return this.memberRepository.count({
      where: { 
        communityId,
        status: CommunityMemberStatus.ACTIVE
      }
    });
  }

  async getRecentlyJoinedMembers(
    communityId: string,
    days: number = 7,
    limit: number = 10
  ): Promise<CommunityMember[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.memberRepository.find({
      where: {
        communityId,
        joinedAt: MoreThanOrEqual(startDate),
        status: CommunityMemberStatus.ACTIVE
      },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
      take: limit
    });
  }

  async getUserJoinedCommunities(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ communities: Community[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.community', 'community')
      .where('member.userId = :userId', { userId })
      .andWhere('member.status = :status', { status: CommunityMemberStatus.ACTIVE })
      .andWhere('community.ownerId != :userId', { userId }) // Exclude owned communities
      .orderBy('member.joinedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [memberships, total] = await queryBuilder.getManyAndCount();
    
    const communities = memberships.map(membership => membership.community);

    return {
      communities,
      total,
      page,
      limit,
    };
  }
}
