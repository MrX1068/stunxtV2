import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { SpaceMember, SpaceMemberRole, SpaceMemberStatus } from '../../shared/entities/space-member.entity';
import { Space } from '../../shared/entities/space.entity';
import { User } from '../../shared/entities/user.entity';
import { CommunityMemberService } from '../community/community-member.service';
import { plainToClass } from 'class-transformer';
import { SpaceMemberResponseDto, SafeUserDto } from '../../shared/dto/response.dto';

@Injectable()
export class SpaceMemberService {
  constructor(
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly communityMemberService: CommunityMemberService,
  ) {}

  async addMember(
    spaceId: string,
    userId: string,
    role: SpaceMemberRole = SpaceMemberRole.MEMBER,
    invitedBy?: string,
    joinMethod: string = 'direct'
  ): Promise<SpaceMember> {
    // Check if space exists
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId }
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if space can accept new members
    if (!space.canJoin()) {
      throw new BadRequestException('Space cannot accept new members');
    }

    // Check if user is already a member
    const existingMember = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId }
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this space');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is a member of the parent community
    const communityMember = await this.communityMemberService.getMember(
      space.communityId,
      userId
    );

    if (!communityMember) {
      throw new BadRequestException('User must be a member of the community to join this space');
    }

    // Create space membership
    const spaceMember = this.spaceMemberRepository.create({
      spaceId,
      userId,
      role,
      status: SpaceMemberStatus.ACTIVE,
      joinedAt: new Date(),
      joinMethod,
      invitedBy,
    });

    const savedMember = await this.spaceMemberRepository.save(spaceMember) as SpaceMember;

    // Update space member count
    space.incrementMemberCount();
    await this.spaceRepository.save(space);

    return savedMember;
  }

  async removeMember(
    spaceId: string,
    userId: string,
    removedBy: string,
    reason?: string
  ): Promise<void> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove space owner
    if (member.role === SpaceMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove space owner');
    }

    // Check if remover has sufficient permissions
    const hasPermission = await this.hasSpacePermission(
      spaceId,
      removedBy,
      SpaceMemberRole.MODERATOR
    );

    if (!hasPermission && removedBy !== userId) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    // Remove member
    await this.spaceMemberRepository.delete({ spaceId, userId });

    // Update space member count
    const space = await this.spaceRepository.findOne({ where: { id: spaceId } });
    if (space) {
      space.decrementMemberCount();
      await this.spaceRepository.save(space);
    }
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    newRole: SpaceMemberRole,
    updatedBy: string
  ): Promise<SpaceMember> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (member.role === SpaceMemberRole.OWNER || newRole === SpaceMemberRole.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    // Check if updater has sufficient permissions
    const hasPermission = await this.hasSpacePermission(
      spaceId,
      updatedBy,
      SpaceMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update member roles');
    }

    const oldRole = member.role;
    member.role = newRole;
    member.updatedAt = new Date();

    const updatedMember = await this.spaceMemberRepository.save(member) as SpaceMember;

    return updatedMember;
  }

  async banMember(
    spaceId: string,
    userId: string,
    bannedBy: string,
    reason?: string
  ): Promise<SpaceMember> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot ban space owner or admins
    if (member.role === SpaceMemberRole.OWNER || member.role === SpaceMemberRole.ADMIN) {
      throw new BadRequestException('Cannot ban space owner or admin');
    }

    // Check if banner has sufficient permissions
    const hasPermission = await this.hasSpacePermission(
      spaceId,
      bannedBy,
      SpaceMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to ban members');
    }

    member.status = SpaceMemberStatus.BANNED;
    member.updatedAt = new Date();

    const updatedMember = await this.spaceMemberRepository.save(member) as SpaceMember;

    return updatedMember;
  }

  async unbanMember(
    spaceId: string,
    userId: string,
    unbannedBy: string
  ): Promise<SpaceMember> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
      relations: ['user']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (!member.isBanned()) {
      throw new BadRequestException('Member is not banned');
    }

    // Check if unbanner has sufficient permissions
    const hasPermission = await this.hasSpacePermission(
      spaceId,
      unbannedBy,
      SpaceMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to unban members');
    }

    member.status = SpaceMemberStatus.ACTIVE;
    member.updatedAt = new Date();

    const updatedMember = await this.spaceMemberRepository.save(member) as SpaceMember;

    return updatedMember;
  }

  async getMember(spaceId: string, userId: string): Promise<SpaceMember | null> {
    return this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
      relations: ['user', 'space']
    });
  }

  async getMembers(
    spaceId: string,
    options?: {
      page?: number;
      limit?: number;
      role?: SpaceMemberRole;
      status?: SpaceMemberStatus;
      search?: string;
    }
  ): Promise<{ members: any[]; total: number }> {
    const queryBuilder = this.spaceMemberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.spaceId = :spaceId', { spaceId })
      .andWhere('member.status = :status', { status: options?.status || SpaceMemberStatus.ACTIVE });

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
      ...plainToClass(SpaceMemberResponseDto, member, { excludeExtraneousValues: true }),
      user: member.user ? plainToClass(SafeUserDto, member.user, { excludeExtraneousValues: true }) : null
    }));

    return { members: safeMembers, total };
  }

  async hasSpacePermission(
    spaceId: string,
    userId: string,
    requiredRole: SpaceMemberRole
  ): Promise<boolean> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId }
    });

    if (!member || member.isBanned()) {
      return false;
    }

    // Define role hierarchy (higher number = more permissions)
    const roleHierarchy = {
      [SpaceMemberRole.MEMBER]: 1,
      [SpaceMemberRole.MODERATOR]: 2,
      [SpaceMemberRole.ADMIN]: 3,
      [SpaceMemberRole.OWNER]: 4,
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId }
    });

    if (!member || member.isBanned()) {
      return false;
    }

    return true;
  }

  async getActiveMemberCount(spaceId: string): Promise<number> {
    return this.spaceMemberRepository.count({
      where: { 
        spaceId,
        status: SpaceMemberStatus.ACTIVE
      }
    });
  }

  async getRecentMembers(
    spaceId: string,
    days: number = 7,
    limit: number = 10
  ): Promise<SpaceMember[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.spaceMemberRepository.find({
      where: {
        spaceId,
        joinedAt: MoreThanOrEqual(startDate),
        status: SpaceMemberStatus.ACTIVE
      },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
      take: limit
    });
  }

  async getUserSpaces(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: SpaceMemberStatus;
    }
  ): Promise<{ memberships: SpaceMember[]; total: number }> {
    const queryBuilder = this.spaceMemberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.space', 'space')
      .leftJoinAndSelect('space.community', 'community')
      .where('member.userId = :userId', { userId })
      .andWhere('member.status = :status', { status: SpaceMemberStatus.ACTIVE });

    if (options?.status) {
      queryBuilder.andWhere('member.status = :memberStatus', { memberStatus: options.status });
    }

    queryBuilder.orderBy('member.joinedAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [memberships, total] = await queryBuilder.getManyAndCount();

    return { memberships, total };
  }

  async getMemberStats(spaceId: string): Promise<any> {
    const stats = await this.spaceMemberRepository
      .createQueryBuilder('member')
      .select([
        'COUNT(*) as totalMembers',
        'COUNT(CASE WHEN member.role = :owner THEN 1 END) as owners',
        'COUNT(CASE WHEN member.role = :admin THEN 1 END) as admins',
        'COUNT(CASE WHEN member.role = :moderator THEN 1 END) as moderators',
        'COUNT(CASE WHEN member.role = :member THEN 1 END) as members',
        'COUNT(CASE WHEN member.status = :active THEN 1 END) as activeMembers',
        'COUNT(CASE WHEN member.status = :banned THEN 1 END) as bannedMembers',
      ])
      .where('member.spaceId = :spaceId', { spaceId })
      .setParameters({
        owner: SpaceMemberRole.OWNER,
        admin: SpaceMemberRole.ADMIN,
        moderator: SpaceMemberRole.MODERATOR,
        member: SpaceMemberRole.MEMBER,
        active: SpaceMemberStatus.ACTIVE,
        banned: SpaceMemberStatus.BANNED,
      })
      .getRawOne();

    return {
      total: parseInt(stats.totalMembers),
      byRole: {
        owners: parseInt(stats.owners),
        admins: parseInt(stats.admins),
        moderators: parseInt(stats.moderators),
        members: parseInt(stats.members),
      },
      byStatus: {
        active: parseInt(stats.activeMembers),
        banned: parseInt(stats.bannedMembers),
      },
    };
  }

  async transferOwnership(
    spaceId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<void> {
    // Verify current owner
    const currentOwner = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId: currentOwnerId, role: SpaceMemberRole.OWNER }
    });

    if (!currentOwner) {
      throw new NotFoundException('Current owner not found');
    }

    // Verify new owner is a member
    const newOwner = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId: newOwnerId }
    });

    if (!newOwner) {
      throw new NotFoundException('New owner is not a member of this space');
    }

    if (newOwner.isBanned()) {
      throw new BadRequestException('Cannot transfer ownership to a banned member');
    }

    // Update roles
    currentOwner.role = SpaceMemberRole.ADMIN;
    newOwner.role = SpaceMemberRole.OWNER;

    await this.spaceMemberRepository.save([currentOwner, newOwner]);

    // Update space owner
    await this.spaceRepository.update(
      { id: spaceId },
      { ownerId: newOwnerId }
    );
  }

  async getMembersByRole(
    spaceId: string,
    role: SpaceMemberRole
  ): Promise<SpaceMember[]> {
    return this.spaceMemberRepository.find({
      where: { spaceId, role, status: SpaceMemberStatus.ACTIVE },
      relations: ['user'],
      order: { joinedAt: 'ASC' }
    });
  }

  async getBannedMembers(
    spaceId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ members: SpaceMember[]; total: number }> {
    const queryBuilder = this.spaceMemberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.spaceId = :spaceId', { spaceId })
      .andWhere('member.status = :status', { status: SpaceMemberStatus.BANNED })
      .orderBy('member.updatedAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [members, total] = await queryBuilder.getManyAndCount();

    return { members, total };
  }

  async getUserJoinedSpaces(
    userId: string,
    communityId?: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ spaces: Space[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.spaceMemberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.space', 'space')
      .where('member.userId = :userId', { userId })
      .andWhere('member.status = :status', { status: SpaceMemberStatus.ACTIVE })
      .andWhere('space.ownerId != :userId', { userId }) // Exclude owned spaces
      .orderBy('member.joinedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (communityId) {
      queryBuilder.andWhere('space.communityId = :communityId', { communityId });
    }

    const [memberships, total] = await queryBuilder.getManyAndCount();
    
    const spaces = memberships.map(membership => membership.space);

    return {
      spaces,
      total,
      page,
      limit,
    };
  }
}
