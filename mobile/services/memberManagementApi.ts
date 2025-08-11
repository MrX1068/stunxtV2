import { useApiStore } from '../stores/api';

// Types for member management
export interface CommunityMember {
  id: string;
  userId: string;
  communityId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'restricted';
  status: 'active' | 'pending' | 'banned' | 'suspended' | 'left' | 'kicked';
  joinedAt: string;
  lastActivityAt?: string;
  joinMethod: string;
  invitedBy?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
  };
}

export interface SpaceMember {
  id: string;
  userId: string;
  spaceId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'restricted';
  status: 'active' | 'pending' | 'banned' | 'suspended' | 'left' | 'kicked';
  joinedAt: string;
  lastActivityAt?: string;
  joinMethod: string;
  invitedBy?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
  };
}

export interface CommunityInvite {
  id: string;
  communityId: string;
  code: string; // Changed from inviteCode to match backend
  type: 'email' | 'link';
  email?: string;
  message?: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  usedAt?: string;
  usedBy?: string;
  isActive: boolean;
}

export interface MemberListParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  status?: string;
}

export interface UpdateMemberRoleParams {
  role: 'admin' | 'moderator' | 'member' | 'restricted';
}

export interface BanMemberParams {
  reason?: string;
}

export interface CreateInviteParams {
  type: 'email' | 'link';
  email?: string;
  message?: string;
  expiresAt?: string;
}

export interface MemberListResponse {
  members: CommunityMember[] | SpaceMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InviteListResponse {
  invites: CommunityInvite[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class MemberManagementApi {
  private getApiStore() {
    return useApiStore.getState();
  }

  // ==================== COMMUNITY MEMBER MANAGEMENT ====================

  /**
   * Get community members with pagination and filtering
   */
  async getCommunityMembers(
    communityId: string,
    params: MemberListParams = {}
  ): Promise<MemberListResponse> {
    const { page = 1, limit = 20, role, search, status } = params;
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(role && { role }),
        ...(search && { search }),
        ...(status && { status }),
      });

      const endpoint = `/communities/${communityId}/members?${queryParams}`;
      console.log(`📤 [MemberApi] Fetching community members: ${endpoint}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.get<MemberListResponse>(endpoint);
console.log("response member", response?.data?.members)
      console.log(`✅ [MemberApi] Fetched ${response} community members`);
      return response?.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to fetch community members:', error);
      throw error;
    }
  }

  /**
   * Update community member role
   */
  async updateCommunityMemberRole(
    communityId: string,
    userId: string,
    params: UpdateMemberRoleParams
  ): Promise<CommunityMember> {
    try {
      const endpoint = `/communities/${communityId}/members/${userId}/role`;
      console.log(`📤 [MemberApi] Updating member role: ${userId} to ${params.role}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.put<{
        success: boolean;
        data: CommunityMember;
        message: string;
      }>(endpoint, params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update member role');
      }

      console.log(`✅ [MemberApi] Updated member role successfully`);
      return response.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to update member role:', error);
      throw error;
    }
  }

  /**
   * Ban community member
   */
  async banCommunityMember(
    communityId: string,
    userId: string,
    params: BanMemberParams = {}
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/members/${userId}/ban`;
      console.log(`📤 [MemberApi] Banning member: ${userId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        message: string;
      }>(endpoint, params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to ban member');
      }

      console.log(`✅ [MemberApi] Banned member successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to ban member:', error);
      throw error;
    }
  }

  /**
   * Unban community member
   */
  async unbanCommunityMember(
    communityId: string,
    userId: string
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/members/${userId}/ban`;
      console.log(`📤 [MemberApi] Unbanning member: ${userId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to unban member');
      }

      console.log(`✅ [MemberApi] Unbanned member successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to unban member:', error);
      throw error;
    }
  }

  /**
   * Remove community member
   */
  async removeCommunityMember(
    communityId: string,
    userId: string
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/members/${userId}`;
      console.log(`📤 [MemberApi] Removing member: ${userId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to remove member');
      }

      console.log(`✅ [MemberApi] Removed member successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to remove member:', error);
      throw error;
    }
  }

  // ==================== COMMUNITY INVITE MANAGEMENT ====================

  /**
   * Create community invite
   */
  async createCommunityInvite(
    communityId: string,
    params: CreateInviteParams
  ): Promise<CommunityInvite> {
    try {
      const endpoint = `/communities/${communityId}/invites`;
      console.log(`📤 [MemberApi] Creating community invite (type: ${params.type})`);

      // Transform frontend params to backend DTO format
      // Backend determines type based on email presence, not explicit type field
      const backendPayload: {
        email?: string;
        message?: string;
        expiresAt?: string;
      } = {
        message: params.message,
        expiresAt: params.expiresAt,
      };

      // Only include email for email invites
      if (params.type === 'email' && params.email) {
        backendPayload.email = params.email;
      }
      // For link invites, don't include email (backend will create link invite)

      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        data: CommunityInvite;
        message: string;
      }>(endpoint, backendPayload);

      if (!response.success) {
        throw new Error(response.message || 'Failed to create invite');
      }

      console.log(`✅ [MemberApi] Created invite successfully: ${response.data.code}`);
      return response.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to create invite:', error);
      throw error;
    }
  }

  /**
   * Get community invites (active only by default)
   */
  async getCommunityInvites(
    communityId: string,
    params: MemberListParams = {}
  ): Promise<InviteListResponse> {
    const { page = 1, limit = 20 } = params;

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const endpoint = `/communities/${communityId}/invites?${queryParams}`;
      console.log(`📤 [MemberApi] Fetching community invites`);

      const apiStore = this.getApiStore();
      const response = await apiStore.get<InviteListResponse>(endpoint);

      console.log(`✅ [MemberApi] Fetched ${response.data?.invites?.length || 0} active invites`);
      return response?.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to fetch invites:', error);
      throw error;
    }
  }

  /**
   * Get revoked community invites
   */
  async getRevokedCommunityInvites(
    communityId: string,
    params: MemberListParams = {}
  ): Promise<InviteListResponse> {
    const { page = 1, limit = 20 } = params;

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const endpoint = `/communities/${communityId}/invites/revoked?${queryParams}`;
      console.log(`📤 [MemberApi] Fetching revoked community invites`);

      const apiStore = this.getApiStore();
      const response = await apiStore.get<{
        success: boolean;
        data: InviteListResponse;
        message: string;
      }>(endpoint);

      console.log(`✅ [MemberApi] Fetched ${response.data?.invites?.length || 0} revoked invites`);
      return response.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to fetch revoked invites:', error);
      throw error;
    }
  }

  /**
   * Revoke community invite
   */
  async revokeCommunityInvite(
    communityId: string,
    inviteId: string
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/invites/${inviteId}`;
      console.log(`📤 [MemberApi] Revoking invite: ${inviteId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to revoke invite');
      }

      console.log(`✅ [MemberApi] Revoked invite successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to revoke invite:', error);
      throw error;
    }
  }

  // ==================== SPACE MEMBER MANAGEMENT ====================

  /**
   * Get space members with pagination and filtering
   */
  async getSpaceMembers(
    communityId: string,
    spaceId: string,
    params: MemberListParams = {}
  ): Promise<MemberListResponse> {
    const { page = 1, limit = 20, role, search, status } = params;
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(role && { role }),
        ...(search && { search }),
        ...(status && { status }),
      });

      const endpoint = `/communities/${communityId}/spaces/${spaceId}/members?${queryParams}`;
      console.log(`📤 [MemberApi] Fetching space members: ${endpoint}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.get<MemberListResponse>(endpoint);

      console.log(`✅ [MemberApi] Fetched ${response.data?.members.length} space members`);
      return response.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to fetch space members:', error);
      throw error;
    }
  }

  /**
   * Update space member role
   */
  async updateSpaceMemberRole(
    communityId: string,
    spaceId: string,
    userId: string,
    params: UpdateMemberRoleParams
  ): Promise<SpaceMember> {
    try {
      const endpoint = `/communities/${communityId}/spaces/${spaceId}/members/${userId}/role`;
      console.log(`📤 [MemberApi] Updating space member role: ${userId} to ${params.role}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.put<{
        success: boolean;
        data: SpaceMember;
        message: string;
      }>(endpoint, params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update space member role');
      }

      console.log(`✅ [MemberApi] Updated space member role successfully`);
      return response.data;

    } catch (error) {
      console.error('❌ [MemberApi] Failed to update space member role:', error);
      throw error;
    }
  }

  /**
   * Ban space member
   */
  async banSpaceMember(
    communityId: string,
    spaceId: string,
    userId: string,
    params: BanMemberParams = {}
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/spaces/${spaceId}/members/${userId}/ban`;
      console.log(`📤 [MemberApi] Banning space member: ${userId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        message: string;
      }>(endpoint, params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to ban space member');
      }

      console.log(`✅ [MemberApi] Banned space member successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to ban space member:', error);
      throw error;
    }
  }

  /**
   * Remove space member
   */
  async removeSpaceMember(
    communityId: string,
    spaceId: string,
    userId: string
  ): Promise<void> {
    try {
      const endpoint = `/communities/${communityId}/spaces/${spaceId}/members/${userId}`;
      console.log(`📤 [MemberApi] Removing space member: ${userId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to remove space member');
      }

      console.log(`✅ [MemberApi] Removed space member successfully`);

    } catch (error) {
      console.error('❌ [MemberApi] Failed to remove space member:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const memberManagementApi = new MemberManagementApi();
