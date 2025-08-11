import { Community } from "../stores/community";
import { 
  CommunityMembership, 
  CommunityMemberRole, 
  CommunityMemberStatus,
  CommunityPermission 
} from "../services/communitySpaceApi";

/**
 * ✅ COMPREHENSIVE COMMUNITY PERMISSION MANAGER
 * 
 * Features:
 * - Role-based access control (RBAC)
 * - Permission checking for all community actions
 * - Space creation and management permissions
 * - Member management permissions
 * - Follows backend permission schema exactly
 */

export interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
}

export class CommunityPermissionManager {
  /**
   * Check if user can access community content
   */
  static canAccessCommunity(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always access
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership status
    if (membership?.isActive) return true;

    // Public communities can be viewed (but not interacted with)
    if (community.type === "public") return true;

    // Private/Secret communities require membership
    return false;
  }

  /**
   * Check if user can create spaces in community
   */
  static canCreateSpace(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always create
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Check role-based permissions
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.CREATE_SPACES);
  }

  /**
   * Check if user can manage spaces in community
   */
  static canManageSpaces(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always manage
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Check role-based permissions
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.MANAGE_SPACES);
  }

  /**
   * Check if user can delete spaces in community
   */
  static canDeleteSpaces(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always delete
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Only owners and admins can delete spaces by default
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.DELETE_SPACES);
  }

  /**
   * Check if user can manage community members
   */
  static canManageMembers(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always manage
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Check role-based permissions
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.MANAGE_MEMBERS);
  }

  /**
   * Check if user can manage community roles
   */
  static canManageRoles(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always manage
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Only owners and admins can manage roles by default
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.MANAGE_ROLES);
  }

  /**
   * Check if user can ban/kick members
   */
  static canBanMembers(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always ban
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Check role-based permissions
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.BAN_MEMBERS);
  }

  /**
   * Check if user can manage community settings
   */
  static canManageSettings(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always manage
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Only owners and admins can manage settings by default
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.MANAGE_SETTINGS);
  }

  /**
   * Check if user can view audit logs
   */
  static canViewAuditLogs(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    if (!community || !user) return false;

    // Owner can always view
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check membership and role
    if (!membership?.isActive) return false;

    // Check role-based permissions
    const allowedRoles: CommunityMemberRole[] = [
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR,
    ];

    if (allowedRoles.includes(membership.role)) return true;

    // Check custom permissions
    return membership.customPermissions.includes(CommunityPermission.VIEW_AUDIT_LOGS);
  }

  /**
   * Get user's effective permissions in community
   */
  static getUserPermissions(
    community: Community,
    user?: User,
    membership?: CommunityMembership
  ): CommunityPermission[] {
    if (!community || !user || !membership?.isActive) return [];

    const permissions: CommunityPermission[] = [];

    // Owner has all permissions
    if (community.ownerId === user.id || community.isOwner) {
      return Object.values(CommunityPermission);
    }

    // Role-based permissions
    switch (membership.role) {
      case CommunityMemberRole.ADMIN:
        permissions.push(
          CommunityPermission.MANAGE_COMMUNITY,
          CommunityPermission.MANAGE_MEMBERS,
          CommunityPermission.MANAGE_ROLES,
          CommunityPermission.MANAGE_SPACES,
          CommunityPermission.CREATE_SPACES,
          CommunityPermission.DELETE_SPACES,
          CommunityPermission.MANAGE_INVITES,
          CommunityPermission.BAN_MEMBERS,
          CommunityPermission.KICK_MEMBERS,
          CommunityPermission.MUTE_MEMBERS,
          CommunityPermission.VIEW_AUDIT_LOGS,
          CommunityPermission.MANAGE_SETTINGS
        );
        break;

      case CommunityMemberRole.MODERATOR:
        permissions.push(
          CommunityPermission.MANAGE_MEMBERS,
          CommunityPermission.CREATE_SPACES,
          CommunityPermission.BAN_MEMBERS,
          CommunityPermission.KICK_MEMBERS,
          CommunityPermission.MUTE_MEMBERS,
          CommunityPermission.VIEW_AUDIT_LOGS
        );
        break;

      case CommunityMemberRole.MEMBER:
        permissions.push(CommunityPermission.CREATE_SPACES);
        break;

      default:
        break;
    }

    // Add custom permissions
    permissions.push(...membership.customPermissions);

    // Remove denied permissions
    return permissions.filter(
      (permission) => !membership.deniedPermissions.includes(permission)
    );
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(
    community: Community,
    permission: CommunityPermission,
    user?: User,
    membership?: CommunityMembership
  ): boolean {
    const userPermissions = this.getUserPermissions(community, user, membership);
    return userPermissions.includes(permission);
  }

  /**
   * Get user's role display name
   */
  static getRoleDisplayName(role: CommunityMemberRole): string {
    switch (role) {
      case CommunityMemberRole.OWNER:
        return 'Owner';
      case CommunityMemberRole.ADMIN:
        return 'Admin';
      case CommunityMemberRole.MODERATOR:
        return 'Moderator';
      case CommunityMemberRole.MEMBER:
        return 'Member';
      case CommunityMemberRole.RESTRICTED:
        return 'Restricted';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get role color for UI display
   */
  static getRoleColor(role: CommunityMemberRole): string {
    switch (role) {
      case CommunityMemberRole.OWNER:
        return '#DC2626'; // red-600
      case CommunityMemberRole.ADMIN:
        return '#EA580C'; // orange-600
      case CommunityMemberRole.MODERATOR:
        return '#7C3AED'; // violet-600
      case CommunityMemberRole.MEMBER:
        return '#059669'; // emerald-600
      case CommunityMemberRole.RESTRICTED:
        return '#6B7280'; // gray-500
      default:
        return '#6B7280';
    }
  }
}

// Export for easy access
export const PermissionManager = CommunityPermissionManager;
