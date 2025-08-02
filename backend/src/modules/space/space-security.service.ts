import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space, SpaceType, SpaceInteractionType } from '../../shared/entities/space.entity';
import { SpaceMember, SpaceMemberRole, SpaceMemberStatus } from '../../shared/entities/space-member.entity';
import { CommunityMember, CommunityMemberStatus } from '../../shared/entities/community-member.entity';
import { Conversation } from '../../shared/entities/conversation.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SpaceContentAccessRequest {
  communityId: string;
  spaceId: string;
  userId: string;
  contentType?: 'posts' | 'messages' | 'threads'; // Made optional for dynamic detection
  action: 'read' | 'write' | 'delete' | 'moderate';
}

export interface AccessResult {
  allowed: boolean;
  permissions: string[];
  spaceMember?: SpaceMember;
  space?: Space;
}

@Injectable()
export class SpaceSecurityService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    @InjectRepository(CommunityMember)
    private readonly communityMemberRepository: Repository<CommunityMember>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Multi-layer security validation for space content access
   * Layer 1: Authentication
   * Layer 2: Community Membership
   * Layer 3: Space Association Verification
   * Layer 4: Space Membership & Permissions
   * Layer 5: Content Type Access Control
   * Layer 6: Audit Logging
   */
  async validateSpaceContentAccess(request: SpaceContentAccessRequest): Promise<AccessResult> {
    // Layer 1: User authentication (handled by guards)
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Layer 2: Validate Community Membership
    await this.validateCommunityMembership(request.userId, request.communityId);

    // Layer 3: Validate Space Association with Community
    const space = await this.validateSpaceInCommunity(request.spaceId, request.communityId);

    // Layer 4: Validate Space Membership & Get Permissions
    const spaceMember = await this.validateSpaceMembership(request.userId, request.spaceId, space);

    // Dynamic content type detection for /content endpoint
    let contentType = request.contentType;
    if (!contentType) {
      // Infer content type based on space interaction type
      contentType = space.interactionType === SpaceInteractionType.CHAT ? 'messages' : 'posts';
    }

    // Layer 5: Validate Content Type Access
    await this.validateContentTypePermissions(
      spaceMember.role, 
      contentType, 
      request.action,
      space.interactionType
    );

    // Layer 6: Log Access Attempt
    await this.logSpaceAccess({...request, contentType}, spaceMember, space);

    return {
      allowed: true,
      permissions: this.getPermissionsForRole(spaceMember.role),
      spaceMember,
      space,
    };
  }

  /**
   * Layer 2: Community Membership Validation
   */
  private async validateCommunityMembership(userId: string, communityId: string): Promise<void> {
    const communityMember = await this.communityMemberRepository.findOne({
      where: {
        userId,
        communityId,
        status: CommunityMemberStatus.ACTIVE,
      },
    });

    if (!communityMember) {
      throw new ForbiddenException('User is not a member of this community');
    }
  }

  /**
   * Layer 3: Space-Community Association Validation
   */
  private async validateSpaceInCommunity(spaceId: string, communityId: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
      select: ['id', 'name', 'communityId', 'type', 'interactionType', 'status', 'ownerId'],
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    if (space.communityId !== communityId) {
      throw new ForbiddenException('Space does not belong to this community');
    }

    if (space.status !== 'active') {
      throw new ForbiddenException('Space is not active');
    }

    return space;
  }

  /**
   * Layer 4: Space Membership Validation
   */
  private async validateSpaceMembership(
    userId: string, 
    spaceId: string, 
    space: Space
  ): Promise<SpaceMember> {
    // Check if user is the space owner
    if (space.ownerId === userId) {
      // Return synthetic owner membership
      return {
        id: 'owner',
        userId,
        spaceId,
        role: SpaceMemberRole.OWNER,
        status: SpaceMemberStatus.ACTIVE,
        joinedAt: new Date(),
      } as SpaceMember;
    }

    // For PUBLIC spaces, allow read access without membership
    const spaceMember = await this.spaceMemberRepository.findOne({
      where: {
        userId,
        spaceId,
        status: SpaceMemberStatus.ACTIVE,
      },
    });

    // Handle different space privacy levels
    if (space.type === SpaceType.PUBLIC && !spaceMember) {
      // Allow guest access for public spaces (read-only)
      return {
        id: 'guest',
        userId,
        spaceId,
        role: SpaceMemberRole.GUEST,
        status: SpaceMemberStatus.ACTIVE,
        joinedAt: new Date(),
      } as SpaceMember;
    }

    if (!spaceMember) {
      throw new ForbiddenException('You are not a member of this space');
    }

    if (spaceMember.status === SpaceMemberStatus.BANNED) {
      throw new ForbiddenException('You are banned from this space');
    }

    if (spaceMember.status === SpaceMemberStatus.SUSPENDED) {
      throw new ForbiddenException('Your access to this space is suspended');
    }

    return spaceMember;
  }

  /**
   * Layer 5: Content Type Permission Validation
   */
  private async validateContentTypePermissions(
    role: SpaceMemberRole,
    contentType: 'posts' | 'messages' | 'threads',
    action: 'read' | 'write' | 'delete' | 'moderate',
    interactionType: SpaceInteractionType
  ): Promise<void> {
    const permissionMatrix = this.getContentPermissionMatrix();
    
    // Check if interaction type supports this content type
    if (!this.isContentTypeSupported(contentType, interactionType)) {
      throw new BadRequestException(
        `Content type '${contentType}' is not supported for ${interactionType} spaces`
      );
    }

    const allowedRoles = permissionMatrix[interactionType]?.[contentType]?.[action];
    
    if (!allowedRoles || !allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `Insufficient permissions: ${role} cannot ${action} ${contentType} in ${interactionType} spaces`
      );
    }
  }

  /**
   * Layer 6: Audit Logging
   */
  private async logSpaceAccess(
    request: SpaceContentAccessRequest,
    spaceMember: SpaceMember,
    space: Space
  ): Promise<void> {
    const logData = {
      eventType: 'space.content.access',
      userId: request.userId,
      spaceId: request.spaceId,
      communityId: request.communityId,
      contentType: request.contentType,
      action: request.action,
      memberRole: spaceMember.role,
      spaceType: space.type,
      interactionType: space.interactionType,
      timestamp: new Date(),
      ipAddress: null, // Should be passed from request context
      userAgent: null, // Should be passed from request context
    };

    // Emit event for audit logging service
    this.eventEmitter.emit('audit.space.access', logData);
  }

  /**
   * Content Type Support Matrix
   */
  private isContentTypeSupported(
    contentType: 'posts' | 'messages' | 'threads',
    interactionType: SpaceInteractionType
  ): boolean {
    const supportMatrix = {
      [SpaceInteractionType.CHAT]: ['messages'],
      [SpaceInteractionType.POST]: ['posts'],
      [SpaceInteractionType.FORUM]: ['posts', 'threads'],
      [SpaceInteractionType.FEED]: ['posts', 'messages'],
    };

    return supportMatrix[interactionType]?.includes(contentType) || false;
  }

  /**
   * Content Permission Matrix
   */
  private getContentPermissionMatrix() {
    return {
      [SpaceInteractionType.CHAT]: {
        messages: {
          read: [SpaceMemberRole.GUEST, SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
      },
      [SpaceInteractionType.POST]: {
        posts: {
          read: [SpaceMemberRole.GUEST, SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
      },
      [SpaceInteractionType.FORUM]: {
        posts: {
          read: [SpaceMemberRole.GUEST, SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
        threads: {
          read: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
      },
      [SpaceInteractionType.FEED]: {
        posts: {
          read: [SpaceMemberRole.GUEST, SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
        messages: {
          read: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          write: [SpaceMemberRole.MEMBER, SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          delete: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
          moderate: [SpaceMemberRole.MODERATOR, SpaceMemberRole.ADMIN, SpaceMemberRole.OWNER],
        },
      },
    };
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: SpaceMemberRole): string[] {
    const rolePermissions = {
      [SpaceMemberRole.GUEST]: ['read'],
      [SpaceMemberRole.MEMBER]: ['read', 'write'],
      [SpaceMemberRole.MODERATOR]: ['read', 'write', 'delete', 'moderate'],
      [SpaceMemberRole.ADMIN]: ['read', 'write', 'delete', 'moderate', 'manage'],
      [SpaceMemberRole.OWNER]: ['read', 'write', 'delete', 'moderate', 'manage', 'transfer', 'destroy'],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Quick access validation methods
   */
  async hasSpaceAccess(spaceId: string, userId: string): Promise<boolean> {
    try {
      const space = await this.spaceRepository.findOne({
        where: { id: spaceId },
        select: ['id', 'ownerId', 'type', 'communityId'],
      });

      if (!space) return false;
      if (space.ownerId === userId) return true;
      if (space.type === SpaceType.PUBLIC) return true;

      const spaceMember = await this.spaceMemberRepository.findOne({
        where: {
          userId,
          spaceId,
          status: SpaceMemberStatus.ACTIVE,
        },
      });

      return !!spaceMember;
    } catch {
      return false;
    }
  }

  async isSpaceMember(spaceId: string, userId: string): Promise<boolean> {
    const spaceMember = await this.spaceMemberRepository.findOne({
      where: {
        userId,
        spaceId,
        status: SpaceMemberStatus.ACTIVE,
      },
    });

    return !!spaceMember;
  }
}
