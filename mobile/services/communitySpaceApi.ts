import { useApiStore, ApiResponse } from '../stores/api';

/**
 * ✅ COMMUNITY SPACE API SERVICE
 * 
 * Handles all API calls related to community spaces, membership, and permissions
 * Based on backend endpoints from COMPLETE_API_ENDPOINTS.md
 */

// TypeScript interfaces matching backend schemas exactly
export interface CommunitySpace {
  id: string;
  name: string;
  description?: string;
  communityId: string;
  ownerId: string;
  type: 'public' | 'private' | 'secret';
  interactionType: 'post' | 'chat' | 'forum' | 'feed';
  status: 'active' | 'archived' | 'suspended' | 'deleted';
  category: 'general' | 'announcements' | 'discussion' | 'projects' | 'support' | 'social' | 'gaming' | 'tech' | 'creative' | 'education' | 'business' | 'entertainment' | 'sports' | 'news' | 'other';
  avatarUrl?: string;
  bannerUrl?: string;
  allowInvites: boolean;
  allowMemberInvites: boolean;
  requireApproval: boolean;
  maxMembers: number;
  memberCount: number;
  messageCount: number;
  lastMessage?: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
  };
  tags: string[];
  isJoined?: boolean;
  userRole?: SpaceMemberRole;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  customPermissions: CommunityPermission[];
  deniedPermissions: CommunityPermission[];
  joinedAt: string;
  lastActivityAt?: string;
  isActive: boolean;
  canParticipate: boolean;
}

export interface SpaceMembership {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceMemberRole;
  status: SpaceMemberStatus;
  joinedAt: string;
  lastActivityAt?: string;
}

// Enums matching backend exactly
export enum CommunityMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  RESTRICTED = 'restricted',
}

export enum CommunityMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  LEFT = 'left',
  KICKED = 'kicked',
}

export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  RESTRICTED = 'restricted',
}

export enum SpaceMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  LEFT = 'left',
  KICKED = 'kicked',
}

export enum CommunityPermission {
  MANAGE_COMMUNITY = 'manage_community',
  MANAGE_MEMBERS = 'manage_members',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_SPACES = 'manage_spaces',
  CREATE_SPACES = 'create_spaces',
  DELETE_SPACES = 'delete_spaces',
  MANAGE_INVITES = 'manage_invites',
  BAN_MEMBERS = 'ban_members',
  KICK_MEMBERS = 'kick_members',
  MUTE_MEMBERS = 'mute_members',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SETTINGS = 'manage_settings',
}

// API Request/Response types
export interface JoinCommunityRequest {
  inviteCode?: string;
  message?: string;
}

export interface JoinCommunityResponse {
  success: boolean;
  membership: CommunityMembership;
  message: string;
}

export interface CreateJoinRequestRequest {
  message?: string;
}

export interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  adminResponse?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  community?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface ProcessJoinRequestRequest {
  adminResponse?: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  type: 'public' | 'private' | 'secret';
  interactionType: 'post' | 'chat' | 'forum' | 'feed';
  category: string;
  requireApproval?: boolean;
  maxMembers?: number;
  tags?: string[];
}

export interface CreateSpaceResponse {
  success: boolean;
  space: CommunitySpace;
  message: string;
}

/**
 * Community Space API Service Class
 */
export class CommunitySpaceApiService {
  private static instance: CommunitySpaceApiService;
  
  public static getInstance(): CommunitySpaceApiService {
    if (!CommunitySpaceApiService.instance) {
      CommunitySpaceApiService.instance = new CommunitySpaceApiService();
    }
    return CommunitySpaceApiService.instance;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { makeRequest } = useApiStore.getState();
    return makeRequest<T>(endpoint, options);
  }

  // Community Spaces
  async getCommunitySpaces(communityId: string): Promise<CommunitySpace[]> {
    console.log(`🔄 [CommunitySpaceApi] Fetching spaces for community: ${communityId}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ spaces: CommunitySpace[] }>>(
        `/communities/${communityId}/spaces`
      );
      
      console.log(`✅ [CommunitySpaceApi] Fetched ${response.data?.spaces?.length || 0} spaces`);
      return response.data?.spaces || [];
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch spaces:`, error);
      throw error;
    }
  }

  async getSpaceById(communityId: string, spaceId: string): Promise<CommunitySpace> {
    console.log(`🔄 [CommunitySpaceApi] Fetching space: ${spaceId}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ space: CommunitySpace }>>(
        `/communities/${communityId}/spaces/${spaceId}`
      );

      console.log(`✅ [CommunitySpaceApi] Fetched space: ${response.data?.space?.name}`);
      return response.data?.space!;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch space:`, error);
      throw error;
    }
  }

  async createSpace(
    communityId: string,
    spaceData: CreateSpaceRequest
  ): Promise<CommunitySpace> {
    console.log(`🔄 [CommunitySpaceApi] Creating space: ${spaceData.name}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<CreateSpaceResponse>>(
        `/communities/${communityId}/spaces`,
        {
          method: 'POST',
          body: JSON.stringify(spaceData),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Created space: ${response.data?.space?.name}`);
      return response.data?.space!;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to create space:`, error);
      throw error;
    }
  }

  // Community Membership
  async joinCommunity(
    communityId: string,
    joinData: JoinCommunityRequest = {}
  ): Promise<CommunityMembership> {
    console.log(`🔄 [CommunitySpaceApi] Joining community: ${communityId}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<JoinCommunityResponse>>(
        `/communities/${communityId}/join`,
        {
          method: 'POST',
          body: JSON.stringify(joinData),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Joined community successfully`);
      return response.data?.membership!;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to join community:`, error);
      throw error;
    }
  }

  async leaveCommunity(communityId: string): Promise<void> {
    console.log(`🔄 [CommunitySpaceApi] Leaving community: ${communityId}`);

    try {
      await this.makeRequest<{ success: boolean }>(
        `/communities/${communityId}/leave`,
        {
          method: 'DELETE',
        }
      );

      console.log(`✅ [CommunitySpaceApi] Left community successfully`);
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to leave community:`, error);
      throw error;
    }
  }

  // Join Request Management
  async createJoinRequest(
    communityId: string,
    requestData: CreateJoinRequestRequest
  ): Promise<JoinRequest> {
    console.log(`🔄 [CommunitySpaceApi] Creating join request for community: ${communityId}`);

    try {
      const response = await this.makeRequest<JoinRequest>(
        `/communities/${communityId}/join-requests`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Join request created successfully`);
      return response;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to create join request:`, error);
      throw error;
    }
  }

  async getPendingJoinRequests(
    communityId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ requests: JoinRequest[]; total: number }> {
    console.log(`🔄 [CommunitySpaceApi] Getting pending join requests for community: ${communityId}`);

    try {
      const response = await this.makeRequest<{ requests: JoinRequest[]; total: number }>(
        `/communities/${communityId}/join-requests?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        }
      );

      console.log(`✅ [CommunitySpaceApi] Retrieved ${response.requests.length} pending requests`);
      return response;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to get pending requests:`, error);
      throw error;
    }
  }

  async approveJoinRequest(
    requestId: string,
    adminResponse?: string
  ): Promise<CommunityMembership> {
    console.log(`🔄 [CommunitySpaceApi] Approving join request: ${requestId}`);

    try {
      const response = await this.makeRequest<CommunityMembership>(
        `/communities/join-requests/${requestId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ adminResponse }),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Join request approved successfully`);
      return response;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to approve join request:`, error);
      throw error;
    }
  }

  async rejectJoinRequest(
    requestId: string,
    adminResponse?: string
  ): Promise<JoinRequest> {
    console.log(`🔄 [CommunitySpaceApi] Rejecting join request: ${requestId}`);

    try {
      const response = await this.makeRequest<JoinRequest>(
        `/communities/join-requests/${requestId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ adminResponse }),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Join request rejected successfully`);
      return response;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to reject join request:`, error);
      throw error;
    }
  }

  async getUserJoinRequests(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ requests: JoinRequest[]; total: number }> {
    console.log(`🔄 [CommunitySpaceApi] Getting user's join requests`);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      const response = await this.makeRequest<{ requests: JoinRequest[]; total: number }>(
        `/communities/me/join-requests?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      console.log(`✅ [CommunitySpaceApi] Retrieved ${response.requests.length} user requests`);
      return response;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to get user requests:`, error);
      throw error;
    }
  }

  async getCommunityMembers(communityId: string): Promise<CommunityMembership[]> {
    console.log(`🔄 [CommunitySpaceApi] Fetching community members: ${communityId}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ members: CommunityMembership[] }>>(
        `/communities/${communityId}/members`
      );

      console.log(`✅ [CommunitySpaceApi] Fetched ${response.data?.members?.length || 0} members`);
      return response.data?.members || [];
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch members:`, error);
      throw error;
    }
  }

  // Space Membership
  async joinSpace(communityId: string, spaceId: string): Promise<SpaceMembership> {
    console.log(`🔄 [CommunitySpaceApi] Joining space: ${spaceId}`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ membership: SpaceMembership }>>(
        `/communities/${communityId}/spaces/${spaceId}/join`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      console.log(`✅ [CommunitySpaceApi] Joined space successfully`);
      return response.data?.membership!;
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to join space:`, error);
      throw error;
    }
  }

  async leaveSpace(communityId: string, spaceId: string): Promise<void> {
    console.log(`🔄 [CommunitySpaceApi] Leaving space: ${spaceId}`);
    
    try {
      await this.makeRequest<{ success: boolean }>(
        `/communities/${communityId}/spaces/${spaceId}/leave`,
        {
          method: 'DELETE',
        }
      );
      
      console.log(`✅ [CommunitySpaceApi] Left space successfully`);
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to leave space:`, error);
      throw error;
    }
  }

  // User's space data
  async getUserSpaceMemberships(communityId: string): Promise<SpaceMembership[]> {
    console.log(`🔄 [CommunitySpaceApi] Fetching user space memberships`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ memberships: SpaceMembership[] }>>(
        `/communities/${communityId}/spaces/me/memberships`
      );

      console.log(`✅ [CommunitySpaceApi] Fetched ${response.data?.memberships?.length || 0} memberships`);
      return response.data?.memberships || [];
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch memberships:`, error);
      throw error;
    }
  }

  async getUserOwnedSpaces(communityId: string): Promise<CommunitySpace[]> {
    console.log(`🔄 [CommunitySpaceApi] Fetching user owned spaces`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ spaces: CommunitySpace[] }>>(
        `/communities/${communityId}/spaces/me/owned`
      );

      console.log(`✅ [CommunitySpaceApi] Fetched ${response.data?.spaces?.length || 0} owned spaces`);
      return response.data?.spaces || [];
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch owned spaces:`, error);
      throw error;
    }
  }

  async getUserJoinedSpaces(communityId: string): Promise<CommunitySpace[]> {
    console.log(`🔄 [CommunitySpaceApi] Fetching user joined spaces`);
    
    try {
      const response = await this.makeRequest<ApiResponse<{ spaces: CommunitySpace[] }>>(
        `/communities/${communityId}/spaces/me/joined`
      );

      console.log(`✅ [CommunitySpaceApi] Fetched ${response.data?.spaces?.length || 0} joined spaces`);
      return response.data?.spaces || [];
    } catch (error) {
      console.error(`❌ [CommunitySpaceApi] Failed to fetch joined spaces:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const communitySpaceApi = CommunitySpaceApiService.getInstance();
