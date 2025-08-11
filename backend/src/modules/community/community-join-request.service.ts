import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityJoinRequest, JoinRequestStatus } from '../../shared/entities/community-join-request.entity';
import { Community, CommunityType } from '../../shared/entities/community.entity';
import { User } from '../../shared/entities/user.entity';
import { CommunityMember, CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { CommunityMemberService } from './community-member.service';
import { CommunityAuditService } from './community-audit.service';

@Injectable()
export class CommunityJoinRequestService {
  constructor(
    @InjectRepository(CommunityJoinRequest)
    private readonly joinRequestRepository: Repository<CommunityJoinRequest>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly memberService: CommunityMemberService,
    private readonly auditService: CommunityAuditService,
  ) {}

  /**
   * Create a join request for secret communities
   */
  async createJoinRequest(
    communityId: string,
    userId: string,
    message?: string
  ): Promise<CommunityJoinRequest> {
    // Verify community exists and is secret
    const community = await this.communityRepository.findOne({
      where: { id: communityId }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    if (community.type !== CommunityType.SECRET) {
      throw new BadRequestException('Join requests are only allowed for secret communities');
    }

    // Check if user is already a member
    const existingMember = await this.memberService.getMember(communityId, userId);
    if (existingMember) {
      throw new ConflictException('User is already a member of this community');
    }

    // Check if there's already a pending request
    const existingRequest = await this.joinRequestRepository.findOne({
      where: { 
        communityId, 
        userId, 
        status: JoinRequestStatus.PENDING 
      }
    });

    if (existingRequest) {
      throw new ConflictException('A join request is already pending for this community');
    }

    // Create join request
    const joinRequest = this.joinRequestRepository.create({
      communityId,
      userId,
      message,
      status: JoinRequestStatus.PENDING,
    });

    const savedRequest = await this.joinRequestRepository.save(joinRequest);

    // Log audit event
    await this.auditService.logJoinRequestCreated(communityId, userId, message);

    return savedRequest;
  }

  /**
   * Get pending join requests for a community (admin/moderator only)
   */
  async getPendingRequests(
    communityId: string,
    adminUserId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ requests: CommunityJoinRequest[]; total: number }> {
    // Check if user has permission to view requests
    const hasPermission = await this.memberService.checkMemberPermissions(
      communityId,
      adminUserId,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view join requests');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [requests, total] = await this.joinRequestRepository.findAndCount({
      where: { 
        communityId, 
        status: JoinRequestStatus.PENDING 
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { requests, total };
  }

  /**
   * Approve a join request
   */
  async approveRequest(
    requestId: string,
    adminUserId: string,
    adminResponse?: string
  ): Promise<CommunityMember> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: requestId },
      relations: ['community', 'user'],
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    if (!joinRequest.canBeProcessed()) {
      throw new BadRequestException('This join request has already been processed');
    }

    // Check if admin has permission
    const hasPermission = await this.memberService.checkMemberPermissions(
      joinRequest.communityId,
      adminUserId,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to approve join requests');
    }

    // Add user to community
    const member = await this.memberService.addMember(
      joinRequest.communityId,
      joinRequest.userId,
      CommunityMemberRole.MEMBER,
      adminUserId,
      'join_request_approved'
    );

    // Update join request
    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.adminResponse = adminResponse;
    joinRequest.processedBy = adminUserId;
    joinRequest.processedAt = new Date();
    await this.joinRequestRepository.save(joinRequest);

    // Log audit event
    await this.auditService.logJoinRequestApproved(
      joinRequest.communityId,
      joinRequest.userId,
      adminUserId,
      adminResponse
    );

    return member;
  }

  /**
   * Reject a join request
   */
  async rejectRequest(
    requestId: string,
    adminUserId: string,
    adminResponse?: string
  ): Promise<CommunityJoinRequest> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: requestId },
      relations: ['community', 'user'],
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    if (!joinRequest.canBeProcessed()) {
      throw new BadRequestException('This join request has already been processed');
    }

    // Check if admin has permission
    const hasPermission = await this.memberService.checkMemberPermissions(
      joinRequest.communityId,
      adminUserId,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to reject join requests');
    }

    // Update join request
    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.adminResponse = adminResponse;
    joinRequest.processedBy = adminUserId;
    joinRequest.processedAt = new Date();
    const updatedRequest = await this.joinRequestRepository.save(joinRequest);

    // Log audit event
    await this.auditService.logJoinRequestRejected(
      joinRequest.communityId,
      joinRequest.userId,
      adminUserId,
      adminResponse
    );

    return updatedRequest;
  }

  /**
   * Cancel a join request (by the user who created it)
   */
  async cancelRequest(
    requestId: string,
    userId: string
  ): Promise<CommunityJoinRequest> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: requestId, userId },
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    if (!joinRequest.canBeProcessed()) {
      throw new BadRequestException('This join request cannot be cancelled');
    }

    joinRequest.status = JoinRequestStatus.CANCELLED;
    const updatedRequest = await this.joinRequestRepository.save(joinRequest);

    // Log audit event
    await this.auditService.logJoinRequestCancelled(
      joinRequest.communityId,
      userId
    );

    return updatedRequest;
  }

  /**
   * Get user's join requests
   */
  async getUserRequests(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: JoinRequestStatus;
    }
  ): Promise<{ requests: CommunityJoinRequest[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const whereCondition: any = { userId };
    if (options?.status) {
      whereCondition.status = options.status;
    }

    const [requests, total] = await this.joinRequestRepository.findAndCount({
      where: whereCondition,
      relations: ['community'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { requests, total };
  }

  /**
   * Get pending requests count for a community
   */
  async getPendingRequestsCount(communityId: string): Promise<number> {
    return this.joinRequestRepository.count({
      where: { 
        communityId, 
        status: JoinRequestStatus.PENDING 
      }
    });
  }
}
