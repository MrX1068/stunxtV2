import { User } from '../stores/auth';
import { Community, Space } from '../stores/posts';

// Backend Role Enums - Must match exactly with backend
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum CommunityMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  RESTRICTED = 'restricted',
}

export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest',
}

// Permission Manager Class
export class PermissionManager {
  // Platform-level permissions (based on user role)
  static canCreateCommunity(user: User | null): boolean {
    if (!user) return false;
    
    // Everyone can create communities
    return true;
  }

  static canManagePlatform(user: User | null): boolean {
    if (!user) return false;
    return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole);
  }

  static canModeratePlatform(user: User | null): boolean {
    if (!user) return false;
    return [UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole);
  }

  // Community-level permissions
  static canCreateSpaceInCommunity(user: User | null, community: Community | null): boolean {
    if (!user || !community) return false;

    // Check if user is a member of the community
    if (!community.isJoined) return false;

    // Community owners can always create spaces
    if (community.ownerId === user.id) return true;

    // Check member role in community
    const memberRole = community.memberRole as CommunityMemberRole;
    if (!memberRole) return false;

    // Admins and moderators can create spaces
    return [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR
    ].includes(memberRole);
  }

  static canManageCommunity(user: User | null, community: Community | null): boolean {
    if (!user || !community) return false;

    // Community owner
    if (community.ownerId === user.id) return true;

    // Platform admins
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole)) return true;

    // Community admins
    const memberRole = community.memberRole as CommunityMemberRole;
    return memberRole === CommunityMemberRole.ADMIN;
  }

  static canModerateCommunity(user: User | null, community: Community | null): boolean {
    if (!user || !community) return false;

    // Include all management permissions plus moderators
    if (this.canManageCommunity(user, community)) return true;

    const memberRole = community.memberRole as CommunityMemberRole;
    return memberRole === CommunityMemberRole.MODERATOR;
  }

  static canEditCommunity(user: User | null, community: Community | null): boolean {
    return this.canManageCommunity(user, community);
  }

  static canDeleteCommunity(user: User | null, community: Community | null): boolean {
    if (!user || !community) return false;

    // Only community owner or platform super admin
    return community.ownerId === user.id || user.role === UserRole.SUPER_ADMIN;
  }

  // Space-level permissions
  static canCreatePostInSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!user || !space) return false;

    // Check if user is a member of the space
    if (!space.isJoined) return false;

    // Check space interaction type
    if (space.interactionType === 'chat') {
      // For chat spaces, posting might be disabled - they should use chat messages
      return false;
    } else if (space.interactionType === 'post' || space.interactionType === 'forum' || space.interactionType === 'feed') {
      // For post-based spaces, check if user has posting permissions
      const spaceRole = space.memberRole as SpaceMemberRole;
      
      // Guests cannot create posts
      if (spaceRole === SpaceMemberRole.GUEST) return false;
      
      // All other roles can create posts
      return [
        SpaceMemberRole.MEMBER,
        SpaceMemberRole.MODERATOR,
        SpaceMemberRole.ADMIN,
        SpaceMemberRole.OWNER
      ].includes(spaceRole);
    }

    return false;
  }

  static canSendMessageInSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!user || !space) return false;

    // Check if user is a member of the space
    if (!space.isJoined) return false;

    // Check space interaction type
    if (space.interactionType === 'chat') {
      // For chat spaces, check if user has messaging permissions
      const spaceRole = space.memberRole as SpaceMemberRole;
      
      // All roles except guests can send messages
      return [
        SpaceMemberRole.MEMBER,
        SpaceMemberRole.MODERATOR,
        SpaceMemberRole.ADMIN,
        SpaceMemberRole.OWNER
      ].includes(spaceRole);
    }

    // For non-chat spaces, messaging might not be available
    return false;
  }

  static canManageSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!user || !space) return false;

    // Space owner
    if (space.ownerId === user.id) return true;

    // Community owner or admin (if community context available)
    if (community && this.canManageCommunity(user, community)) return true;

    // Space admin
    const spaceRole = space.memberRole as SpaceMemberRole;
    return spaceRole === SpaceMemberRole.ADMIN;
  }

  static canModerateSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!user || !space) return false;

    // Include all management permissions plus moderators
    if (this.canManageSpace(user, space, community)) return true;

    // Community moderator (if community context available)
    if (community && this.canModerateCommunity(user, community)) return true;

    // Space moderator
    const spaceRole = space.memberRole as SpaceMemberRole;
    return spaceRole === SpaceMemberRole.MODERATOR;
  }

  static canEditSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    return this.canManageSpace(user, space, community);
  }

  static canDeleteSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!user || !space) return false;

    // Only space owner, community owner (if available), or platform super admin
    return (
      space.ownerId === user.id ||
      (community && community.ownerId === user.id) ||
      user.role === UserRole.SUPER_ADMIN
    );
  }

  // Access control helpers
  static canAccessCommunity(user: User | null, community: Community | null): boolean {
    if (!community) return false;
    
    // Public communities can be accessed by anyone
    if (community.type === 'public') return true;
    
    // Private and secret communities require membership
    if (!user) return false;
    
    // Check if user is a member
    return community.isJoined || community.ownerId === user.id;
  }

  static canAccessSpace(user: User | null, space: Space | null, community?: Community | null): boolean {
    if (!space) return false;

    // If community context is available, check community access first
    if (community && !this.canAccessCommunity(user, community)) return false;

    // Public spaces can be accessed if community access is granted
    if (space.type === 'public') return true;

    // Private and secret spaces require membership
    if (!user) return false;
    return space.isJoined || space.ownerId === user.id;
  }

  // Helper method to get effective role in context
  static getEffectiveRole(user: User | null, community: Community | null, space: Space | null): string {
    if (!user) return 'guest';

    // Platform role takes precedence for platform-wide permissions
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role as UserRole)) {
      return user.role;
    }

    // Space role if in space context
    if (space?.memberRole) {
      return space.memberRole;
    }

    // Community role if in community context
    if (community?.memberRole) {
      return community.memberRole;
    }

    // Platform role as fallback
    return user.role;
  }
}

// Export default for easier imports
export default PermissionManager;
