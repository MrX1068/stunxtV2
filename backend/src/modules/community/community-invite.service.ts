import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CommunityInvite, CommunityInviteType, CommunityInviteStatus } from '../../shared/entities/community-invite.entity';
import { Community } from '../../shared/entities/community.entity';
import { User } from '../../shared/entities/user.entity';
import { CommunityMember, CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { CommunityAuditService } from './community-audit.service';
import { CommunityMemberService } from './community-member.service';
import * as crypto from 'crypto';

@Injectable()
export class CommunityInviteService {
  constructor(
    @InjectRepository(CommunityInvite)
    private readonly inviteRepository: Repository<CommunityInvite>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: CommunityAuditService,
    private readonly memberService: CommunityMemberService,
  ) {}

  async createInvite(
    communityId: string,
    createdBy: string,
    options: {
      type: CommunityInviteType;
      email?: string;
      maxUses?: number;
      expiresAt?: Date;
      message?: string;
      targetRole?: CommunityMemberRole;
    }
  ): Promise<CommunityInvite> {
    // Verify community exists
    const community = await this.communityRepository.findOne({
      where: { id: communityId }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if creator has permission to invite
    const hasPermission = await this.memberService.checkMemberPermissions(
      communityId,
      createdBy,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create invites');
    }

    // For email invites, check if user is already a member
    if (options.type === CommunityInviteType.EMAIL && options.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: options.email }
      });

      if (existingUser) {
        const existingMember = await this.memberService.getMember(communityId, existingUser.id);
        if (existingMember) {
          throw new BadRequestException('User is already a member of this community');
        }
      }

      // Check for existing pending email invite
      const existingInvite = await this.inviteRepository.findOne({
        where: {
          communityId,
          email: options.email,
          status: CommunityInviteStatus.PENDING
        }
      });

      if (existingInvite) {
        throw new BadRequestException('An invite has already been sent to this email');
      }
    }

    // Generate invite code
    const code = this.generateInviteCode();

    // Set default expiration if not provided (7 days)
    const expiresAt = options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invite
    const invite = this.inviteRepository.create({
      communityId,
      invitedBy: createdBy,
      type: options.type,
      code,
      email: options.email,
      message: options.message,
      maxUses: options.maxUses || (options.type === CommunityInviteType.LINK ? 100 : 1),
      currentUses: 0,
      expiresAt,
      status: CommunityInviteStatus.PENDING,
      metadata: {
        targetRole: options.targetRole || CommunityMemberRole.MEMBER
      }
    });

    const savedInvite = await this.inviteRepository.save(invite) as CommunityInvite;

    // Log audit event
    await this.auditService.logInviteCreated(
      communityId,
      savedInvite.id,
      createdBy,
      options.type
    );

    return savedInvite;
  }

  async acceptInvite(
    code: string,
    userId: string,
    email?: string
  ): Promise<CommunityMember> {
    const invite = await this.inviteRepository.findOne({
      where: { code },
      relations: ['community', 'creator']
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if invite is still valid
    if (invite.status !== CommunityInviteStatus.PENDING) {
      throw new BadRequestException('Invite is no longer valid');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      // Mark as expired
      invite.status = CommunityInviteStatus.EXPIRED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('Invite has expired');
    }

    if (invite.currentUses >= invite.maxUses) {
      // Mark as fully used  
      invite.status = CommunityInviteStatus.ACCEPTED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('Invite has reached maximum uses');
    }

    // For email invites, verify email matches
    if (invite.type === CommunityInviteType.EMAIL && invite.email) {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user || user.email !== invite.email) {
        throw new BadRequestException('Invite email does not match user email');
      }
    }

    // Check if user is already a member
    const existingMember = await this.memberService.getMember(invite.communityId, userId);
    if (existingMember) {
      throw new BadRequestException('User is already a member of this community');
    }

    // Add user to community
    const member = await this.memberService.addMember(
      invite.communityId,
      userId,
      invite.metadata?.targetRole || CommunityMemberRole.MEMBER,
      invite.invitedBy,
      'invite'
    );

    // Update invite usage
    invite.currentUses += 1;
    invite.acceptedAt = new Date();
    if (invite.currentUses >= invite.maxUses) {
      invite.status = CommunityInviteStatus.ACCEPTED;
    }
    await this.inviteRepository.save(invite);

    return member;
  }

  async declineInvite(code: string, userId: string): Promise<void> {
    const invite = await this.inviteRepository.findOne({
      where: { code }
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (invite.type === CommunityInviteType.EMAIL && invite.email) {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user || user.email !== invite.email) {
        throw new BadRequestException('Invite email does not match user email');
      }
    }

    invite.status = CommunityInviteStatus.DECLINED;
    await this.inviteRepository.save(invite);
  }

  async revokeInvite(inviteId: string, revokedBy: string): Promise<void> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId }
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Check if user has permission to revoke
    const hasPermission = await this.memberService.checkMemberPermissions(
      invite.communityId,
      revokedBy,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission && invite.invitedBy !== revokedBy) {
      throw new ForbiddenException('You do not have permission to revoke this invite');
    }

    invite.status = CommunityInviteStatus.REVOKED;
    invite.revokedAt = new Date();
    invite.revokeReason = `Revoked by user`;
    await this.inviteRepository.save(invite);
  }

  async getInvite(code: string): Promise<CommunityInvite | null> {
    return this.inviteRepository.findOne({
      where: { code },
      relations: ['community', 'creator']
    });
  }

  async getCommunityInvites(
    communityId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: CommunityInviteStatus;
      type?: CommunityInviteType;
      createdBy?: string;
    }
  ): Promise<{ invites: CommunityInvite[]; total: number }> {
    const queryBuilder = this.inviteRepository
      .createQueryBuilder('invite')
      .leftJoinAndSelect('invite.creator', 'creator')
      .where('invite.communityId = :communityId', { communityId });

    if (options?.status) {
      queryBuilder.andWhere('invite.status = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('invite.type = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('invite.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    queryBuilder.orderBy('invite.createdAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [invites, total] = await queryBuilder.getManyAndCount();

    return { invites, total };
  }

  async getUserInvites(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: CommunityInviteStatus;
    }
  ): Promise<{ invites: CommunityInvite[]; total: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryBuilder = this.inviteRepository
      .createQueryBuilder('invite')
      .leftJoinAndSelect('invite.community', 'community')
      .leftJoinAndSelect('invite.creator', 'creator')
      .where('invite.email = :email', { email: user.email });

    if (options?.status) {
      queryBuilder.andWhere('invite.status = :status', { status: options.status });
    }

    queryBuilder.orderBy('invite.createdAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [invites, total] = await queryBuilder.getManyAndCount();

    return { invites, total };
  }

  async cleanupExpiredInvites(): Promise<number> {
    const expiredInvites = await this.inviteRepository.find({
      where: {
        status: CommunityInviteStatus.PENDING,
        expiresAt: MoreThan(new Date())
      }
    });

    if (expiredInvites.length === 0) {
      return 0;
    }

    await this.inviteRepository.update(
      { 
        status: CommunityInviteStatus.PENDING,
        expiresAt: MoreThan(new Date())
      },
      { status: CommunityInviteStatus.EXPIRED }
    );

    return expiredInvites.length;
  }

  async getInviteStats(communityId: string): Promise<any> {
    const stats = await this.inviteRepository
      .createQueryBuilder('invite')
      .select([
        'COUNT(*) as totalInvites',
        'COUNT(CASE WHEN invite.status = :pending THEN 1 END) as pendingInvites',
        'COUNT(CASE WHEN invite.status = :accepted THEN 1 END) as acceptedInvites',
        'COUNT(CASE WHEN invite.status = :expired THEN 1 END) as expiredInvites',
        'COUNT(CASE WHEN invite.status = :declined THEN 1 END) as declinedInvites',
        'COUNT(CASE WHEN invite.status = :revoked THEN 1 END) as revokedInvites',
        'COUNT(CASE WHEN invite.type = :email THEN 1 END) as emailInvites',
        'COUNT(CASE WHEN invite.type = :link THEN 1 END) as linkInvites',
      ])
      .where('invite.communityId = :communityId', { communityId })
      .setParameters({
        pending: CommunityInviteStatus.PENDING,
        used: CommunityInviteStatus.ACCEPTED,
        expired: CommunityInviteStatus.EXPIRED,
        declined: CommunityInviteStatus.DECLINED,
        revoked: CommunityInviteStatus.REVOKED,
        email: CommunityInviteType.EMAIL,
        link: CommunityInviteType.LINK,
      })
      .getRawOne();

    return {
      total: parseInt(stats.totalInvites),
      byStatus: {
        pending: parseInt(stats.pendingInvites),
        accepted: parseInt(stats.acceptedInvites),
        expired: parseInt(stats.expiredInvites),
        declined: parseInt(stats.declinedInvites),
        revoked: parseInt(stats.revokedInvites),
      },
      byType: {
        email: parseInt(stats.emailInvites),
        link: parseInt(stats.linkInvites),
      },
    };
  }

  private generateInviteCode(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async resendEmailInvite(inviteId: string, resentBy: string): Promise<CommunityInvite> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
      relations: ['community']
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.type !== CommunityInviteType.EMAIL) {
      throw new BadRequestException('Only email invites can be resent');
    }

    if (invite.status !== CommunityInviteStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invites');
    }

    // Check if user has permission
    const hasPermission = await this.memberService.checkMemberPermissions(
      invite.communityId,
      resentBy,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission && invite.invitedBy !== resentBy) {
      throw new ForbiddenException('You do not have permission to resend this invite');
    }

    // Update metadata for resend tracking
    const currentCount = invite.metadata?.resentCount || 0;
    invite.metadata = {
      ...invite.metadata,
      resentCount: currentCount + 1,
      lastResentAt: new Date().toISOString()
    };

    const updatedInvite = await this.inviteRepository.save(invite) as CommunityInvite;

    // Here you would integrate with email service to send the invite
    // await this.emailService.sendCommunityInvite(invite);

    return updatedInvite;
  }

  async rejectInvite(inviteCode: string, userId: string): Promise<{ message: string }> {
    // Find the invite
    const invite = await this.inviteRepository.findOne({
      where: { 
        code: inviteCode,
        status: CommunityInviteStatus.PENDING
      },
      relations: ['community']
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // For email invites, verify the user's email matches
    if (invite.type === CommunityInviteType.EMAIL) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.email !== invite.email) {
        throw new ForbiddenException('This invitation is not for your email address');
      }
    }

    // Update invite status to rejected using the entity method
    invite.reject();

    await this.inviteRepository.save(invite);

    // Log the action
    await this.auditService.logInviteRejected(
      invite.communityId,
      invite.id,
      userId,
      'User rejected invitation'
    );

    return { message: 'Invitation rejected successfully' };
  }
}
