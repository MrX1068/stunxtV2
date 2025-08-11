import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import {
  memberManagementApi,
  CommunityMember,
  SpaceMember,
  CommunityInvite,
  MemberListParams,
  UpdateMemberRoleParams,
  BanMemberParams,
  CreateInviteParams,
} from '../services/memberManagementApi';

/**
 * ✅ MEMBER MANAGEMENT STORE
 * 
 * Comprehensive member management for communities and spaces
 * Features:
 * - Member lists with pagination and search
 * - Role management (promote/demote)
 * - Member moderation (ban/unban/remove)
 * - Invite management
 * - RBAC controls
 * - Real-time updates
 */

interface MemberManagementState {
  // Community Members
  communityMembers: Record<string, CommunityMember[]>;
  communityMembersPagination: Record<string, {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }>;

  // Space Members
  spaceMembers: Record<string, SpaceMember[]>;
  spaceMembersPagination: Record<string, {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }>;

  // Community Invites
  communityInvites: Record<string, CommunityInvite[]>;
  communityInvitesPagination: Record<string, {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }>;

  // Loading States
  loadingCommunityMembers: Record<string, boolean>;
  loadingSpaceMembers: Record<string, boolean>;
  loadingCommunityInvites: Record<string, boolean>;
  updatingMemberRole: Record<string, boolean>;
  banningMember: Record<string, boolean>;
  removingMember: Record<string, boolean>;
  creatingInvite: Record<string, boolean>;
  revokingInvite: Record<string, boolean>;

  // Error States
  communityMembersError: Record<string, string | null>;
  spaceMembersError: Record<string, string | null>;
  communityInvitesError: Record<string, string | null>;
  memberActionError: string | null;

  // Search and Filters
  memberSearchQuery: Record<string, string>;
  memberFilters: Record<string, {
    role?: string;
    status?: string;
  }>;
}

interface MemberManagementActions {
  // Community Member Actions
  fetchCommunityMembers: (communityId: string, params?: MemberListParams) => Promise<void>;
  loadMoreCommunityMembers: (communityId: string) => Promise<void>;
  searchCommunityMembers: (communityId: string, query: string) => Promise<void>;
  updateCommunityMemberRole: (communityId: string, userId: string, role: string) => Promise<void>;
  banCommunityMember: (communityId: string, userId: string, reason?: string) => Promise<void>;
  unbanCommunityMember: (communityId: string, userId: string) => Promise<void>;
  removeCommunityMember: (communityId: string, userId: string) => Promise<void>;

  // Space Member Actions
  fetchSpaceMembers: (communityId: string, spaceId: string, params?: MemberListParams) => Promise<void>;
  loadMoreSpaceMembers: (communityId: string, spaceId: string) => Promise<void>;
  searchSpaceMembers: (communityId: string, spaceId: string, query: string) => Promise<void>;
  updateSpaceMemberRole: (communityId: string, spaceId: string, userId: string, role: string) => Promise<void>;
  banSpaceMember: (communityId: string, spaceId: string, userId: string, reason?: string) => Promise<void>;
  removeSpaceMember: (communityId: string, spaceId: string, userId: string) => Promise<void>;

  // Community Invite Actions
  fetchCommunityInvites: (communityId: string, params?: MemberListParams) => Promise<void>;
  createCommunityInvite: (communityId: string, params: CreateInviteParams) => Promise<CommunityInvite>;
  revokeCommunityInvite: (communityId: string, inviteId: string) => Promise<void>;

  // Utility Actions
  clearMemberActionError: () => void;
  clearCommunityMembersError: (communityId: string) => void;
  clearSpaceMembersError: (spaceId: string) => void;
  clearCommunityInvitesError: (communityId: string) => void;
  setMemberSearchQuery: (key: string, query: string) => void;
  setMemberFilters: (key: string, filters: { role?: string; status?: string }) => void;
}

type MemberManagementStore = MemberManagementState & MemberManagementActions;

const initialState: MemberManagementState = {
  // Data
  communityMembers: {},
  communityMembersPagination: {},
  spaceMembers: {},
  spaceMembersPagination: {},
  communityInvites: {},
  communityInvitesPagination: {},

  // Loading states
  loadingCommunityMembers: {},
  loadingSpaceMembers: {},
  loadingCommunityInvites: {},
  updatingMemberRole: {},
  banningMember: {},
  removingMember: {},
  creatingInvite: {},
  revokingInvite: {},

  // Error states
  communityMembersError: {},
  spaceMembersError: {},
  communityInvitesError: {},
  memberActionError: null,

  // Search and filters
  memberSearchQuery: {},
  memberFilters: {},
};

export const useMemberManagementStore = create<MemberManagementStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // ==================== COMMUNITY MEMBER ACTIONS ====================

      fetchCommunityMembers: async (communityId: string, params: MemberListParams = {}) => {
        console.log(`🔄 [MemberStore] Fetching community members: ${communityId}`);
        
        set((state) => {
          state.loadingCommunityMembers[communityId] = true;
          state.communityMembersError[communityId] = null;
        });

        try {
          const response = await memberManagementApi.getCommunityMembers(communityId, params);
          
          set((state) => {
            state.communityMembers[communityId] = response.members as CommunityMember[];
            state.communityMembersPagination[communityId] = {
              total: response.total,
              page: response.page,
              limit: response.limit,
              totalPages: response.totalPages,
              hasMore: response.page < response.totalPages,
            };
          });

          console.log(`✅ [MemberStore] Fetched ${response.members.length} community members`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to fetch community members:', error);
          set((state) => {
            state.communityMembersError[communityId] = error.message || 'Failed to fetch members';
          });
          throw error;
        } finally {
          set((state) => {
            state.loadingCommunityMembers[communityId] = false;
          });
        }
      },

      loadMoreCommunityMembers: async (communityId: string) => {
        const pagination = get().communityMembersPagination[communityId];
        if (!pagination?.hasMore) return;

        const nextPage = pagination.page + 1;
        const searchQuery = get().memberSearchQuery[communityId];
        const filters = get().memberFilters[communityId];

        try {
          const response = await memberManagementApi.getCommunityMembers(communityId, {
            page: nextPage,
            limit: pagination.limit,
            search: searchQuery,
            ...filters,
          });
          
          set((state) => {
            const existing = state.communityMembers[communityId] || [];
            state.communityMembers[communityId] = [...existing, ...response.members as CommunityMember[]];
            state.communityMembersPagination[communityId] = {
              total: response.total,
              page: response.page,
              limit: response.limit,
              totalPages: response.totalPages,
              hasMore: response.page < response.totalPages,
            };
          });

          console.log(`✅ [MemberStore] Loaded ${response.members.length} more community members`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to load more community members:', error);
          set((state) => {
            state.communityMembersError[communityId] = error.message || 'Failed to load more members';
          });
          throw error;
        }
      },

      searchCommunityMembers: async (communityId: string, query: string) => {
        console.log(`🔍 [MemberStore] Searching community members: "${query}"`);
        
        set((state) => {
          state.memberSearchQuery[communityId] = query;
        });

        const filters = get().memberFilters[communityId];
        await get().fetchCommunityMembers(communityId, {
          search: query,
          ...filters,
        });
      },

      updateCommunityMemberRole: async (communityId: string, userId: string, role: string) => {
        console.log(`🔄 [MemberStore] Updating community member role: ${userId} to ${role}`);
        
        const actionKey = `${communityId}-${userId}`;
        set((state) => {
          state.updatingMemberRole[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          const updatedMember = await memberManagementApi.updateCommunityMemberRole(
            communityId,
            userId,
            { role: role as any }
          );
          
          set((state) => {
            const members = state.communityMembers[communityId] || [];
            const memberIndex = members.findIndex(m => m.userId === userId);
            if (memberIndex !== -1) {
              members[memberIndex] = updatedMember;
            }
          });

          console.log(`✅ [MemberStore] Updated community member role successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to update community member role:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to update member role';
          });
          throw error;
        } finally {
          set((state) => {
            state.updatingMemberRole[actionKey] = false;
          });
        }
      },

      banCommunityMember: async (communityId: string, userId: string, reason?: string) => {
        console.log(`🔄 [MemberStore] Banning community member: ${userId}`);
        
        const actionKey = `${communityId}-${userId}`;
        set((state) => {
          state.banningMember[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.banCommunityMember(communityId, userId, { reason });
          
          set((state) => {
            const members = state.communityMembers[communityId] || [];
            const memberIndex = members.findIndex(m => m.userId === userId);
            if (memberIndex !== -1) {
              members[memberIndex].status = 'banned';
            }
          });

          console.log(`✅ [MemberStore] Banned community member successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to ban community member:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to ban member';
          });
          throw error;
        } finally {
          set((state) => {
            state.banningMember[actionKey] = false;
          });
        }
      },

      unbanCommunityMember: async (communityId: string, userId: string) => {
        console.log(`🔄 [MemberStore] Unbanning community member: ${userId}`);
        
        const actionKey = `${communityId}-${userId}`;
        set((state) => {
          state.banningMember[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.unbanCommunityMember(communityId, userId);
          
          set((state) => {
            const members = state.communityMembers[communityId] || [];
            const memberIndex = members.findIndex(m => m.userId === userId);
            if (memberIndex !== -1) {
              members[memberIndex].status = 'active';
            }
          });

          console.log(`✅ [MemberStore] Unbanned community member successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to unban community member:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to unban member';
          });
          throw error;
        } finally {
          set((state) => {
            state.banningMember[actionKey] = false;
          });
        }
      },

      removeCommunityMember: async (communityId: string, userId: string) => {
        console.log(`🔄 [MemberStore] Removing community member: ${userId}`);
        
        const actionKey = `${communityId}-${userId}`;
        set((state) => {
          state.removingMember[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.removeCommunityMember(communityId, userId);
          
          set((state) => {
            const members = state.communityMembers[communityId] || [];
            state.communityMembers[communityId] = members.filter(m => m.userId !== userId);
            
            // Update pagination total
            const pagination = state.communityMembersPagination[communityId];
            if (pagination) {
              pagination.total = Math.max(0, pagination.total - 1);
            }
          });

          console.log(`✅ [MemberStore] Removed community member successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to remove community member:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to remove member';
          });
          throw error;
        } finally {
          set((state) => {
            state.removingMember[actionKey] = false;
          });
        }
      },

      // ==================== SPACE MEMBER ACTIONS ====================

      fetchSpaceMembers: async (communityId: string, spaceId: string, params: MemberListParams = {}) => {
        console.log(`🔄 [MemberStore] Fetching space members: ${spaceId}`);
        
        set((state) => {
          state.loadingSpaceMembers[spaceId] = true;
          state.spaceMembersError[spaceId] = null;
        });

        try {
          const response = await memberManagementApi.getSpaceMembers(communityId, spaceId, params);
          
          set((state) => {
            state.spaceMembers[spaceId] = response.members as SpaceMember[];
            state.spaceMembersPagination[spaceId] = {
              total: response.total,
              page: response.page,
              limit: response.limit,
              totalPages: response.totalPages,
              hasMore: response.page < response.totalPages,
            };
          });

          console.log(`✅ [MemberStore] Fetched ${response.members.length} space members`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to fetch space members:', error);
          set((state) => {
            state.spaceMembersError[spaceId] = error.message || 'Failed to fetch space members';
          });
          throw error;
        } finally {
          set((state) => {
            state.loadingSpaceMembers[spaceId] = false;
          });
        }
      },

      loadMoreSpaceMembers: async (communityId: string, spaceId: string) => {
        const pagination = get().spaceMembersPagination[spaceId];
        if (!pagination?.hasMore) return;

        const nextPage = pagination.page + 1;
        const searchQuery = get().memberSearchQuery[spaceId];
        const filters = get().memberFilters[spaceId];

        try {
          const response = await memberManagementApi.getSpaceMembers(communityId, spaceId, {
            page: nextPage,
            limit: pagination.limit,
            search: searchQuery,
            ...filters,
          });
          
          set((state) => {
            const existing = state.spaceMembers[spaceId] || [];
            state.spaceMembers[spaceId] = [...existing, ...response.members as SpaceMember[]];
            state.spaceMembersPagination[spaceId] = {
              total: response.total,
              page: response.page,
              limit: response.limit,
              totalPages: response.totalPages,
              hasMore: response.page < response.totalPages,
            };
          });

          console.log(`✅ [MemberStore] Loaded ${response.members.length} more space members`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to load more space members:', error);
          set((state) => {
            state.spaceMembersError[spaceId] = error.message || 'Failed to load more space members';
          });
          throw error;
        }
      },

      searchSpaceMembers: async (communityId: string, spaceId: string, query: string) => {
        console.log(`🔍 [MemberStore] Searching space members: "${query}"`);
        
        set((state) => {
          state.memberSearchQuery[spaceId] = query;
        });

        const filters = get().memberFilters[spaceId];
        await get().fetchSpaceMembers(communityId, spaceId, {
          search: query,
          ...filters,
        });
      },

      updateSpaceMemberRole: async (communityId: string, spaceId: string, userId: string, role: string) => {
        console.log(`🔄 [MemberStore] Updating space member role: ${userId} to ${role}`);
        
        const actionKey = `${spaceId}-${userId}`;
        set((state) => {
          state.updatingMemberRole[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          const updatedMember = await memberManagementApi.updateSpaceMemberRole(
            communityId,
            spaceId,
            userId,
            { role: role as any }
          );
          
          set((state) => {
            const members = state.spaceMembers[spaceId] || [];
            const memberIndex = members.findIndex(m => m.userId === userId);
            if (memberIndex !== -1) {
              members[memberIndex] = updatedMember;
            }
          });

          console.log(`✅ [MemberStore] Updated space member role successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to update space member role:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to update space member role';
          });
          throw error;
        } finally {
          set((state) => {
            state.updatingMemberRole[actionKey] = false;
          });
        }
      },

      banSpaceMember: async (communityId: string, spaceId: string, userId: string, reason?: string) => {
        console.log(`🔄 [MemberStore] Banning space member: ${userId}`);
        
        const actionKey = `${spaceId}-${userId}`;
        set((state) => {
          state.banningMember[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.banSpaceMember(communityId, spaceId, userId, { reason });
          
          set((state) => {
            const members = state.spaceMembers[spaceId] || [];
            const memberIndex = members.findIndex(m => m.userId === userId);
            if (memberIndex !== -1) {
              members[memberIndex].status = 'banned';
            }
          });

          console.log(`✅ [MemberStore] Banned space member successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to ban space member:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to ban space member';
          });
          throw error;
        } finally {
          set((state) => {
            state.banningMember[actionKey] = false;
          });
        }
      },

      removeSpaceMember: async (communityId: string, spaceId: string, userId: string) => {
        console.log(`🔄 [MemberStore] Removing space member: ${userId}`);
        
        const actionKey = `${spaceId}-${userId}`;
        set((state) => {
          state.removingMember[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.removeSpaceMember(communityId, spaceId, userId);
          
          set((state) => {
            const members = state.spaceMembers[spaceId] || [];
            state.spaceMembers[spaceId] = members.filter(m => m.userId !== userId);
            
            // Update pagination total
            const pagination = state.spaceMembersPagination[spaceId];
            if (pagination) {
              pagination.total = Math.max(0, pagination.total - 1);
            }
          });

          console.log(`✅ [MemberStore] Removed space member successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to remove space member:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to remove space member';
          });
          throw error;
        } finally {
          set((state) => {
            state.removingMember[actionKey] = false;
          });
        }
      },

      // ==================== COMMUNITY INVITE ACTIONS ====================

      fetchCommunityInvites: async (communityId: string, params: MemberListParams = {}) => {
        console.log(`🔄 [MemberStore] Fetching community invites: ${communityId}`);
        
        set((state) => {
          state.loadingCommunityInvites[communityId] = true;
          state.communityInvitesError[communityId] = null;
        });

        try {
          const response = await memberManagementApi.getCommunityInvites(communityId, params);
          
          set((state) => {
            state.communityInvites[communityId] = response.invites;
            state.communityInvitesPagination[communityId] = {
              total: response.total,
              page: response.page,
              limit: response.limit,
              totalPages: response.totalPages,
              hasMore: response.page < response.totalPages,
            };
          });

          console.log(`✅ [MemberStore] Fetched ${response.invites.length} community invites`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to fetch community invites:', error);
          set((state) => {
            state.communityInvitesError[communityId] = error.message || 'Failed to fetch invites';
          });
          throw error;
        } finally {
          set((state) => {
            state.loadingCommunityInvites[communityId] = false;
          });
        }
      },

      createCommunityInvite: async (communityId: string, params: CreateInviteParams) => {
        console.log(`🔄 [MemberStore] Creating community invite`);
        
        set((state) => {
          state.creatingInvite[communityId] = true;
          state.memberActionError = null;
        });

        try {
          const invite = await memberManagementApi.createCommunityInvite(communityId, params);
          
          set((state) => {
            const invites = state.communityInvites[communityId] || [];
            state.communityInvites[communityId] = [invite, ...invites];
            
            // Update pagination total
            const pagination = state.communityInvitesPagination[communityId];
            if (pagination) {
              pagination.total = pagination.total + 1;
            }
          });

          console.log(`✅ [MemberStore] Created community invite successfully`);
          return invite;

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to create community invite:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to create invite';
          });
          throw error;
        } finally {
          set((state) => {
            state.creatingInvite[communityId] = false;
          });
        }
      },

      revokeCommunityInvite: async (communityId: string, inviteId: string) => {
        console.log(`🔄 [MemberStore] Revoking community invite: ${inviteId}`);
        
        const actionKey = `${communityId}-${inviteId}`;
        set((state) => {
          state.revokingInvite[actionKey] = true;
          state.memberActionError = null;
        });

        try {
          await memberManagementApi.revokeCommunityInvite(communityId, inviteId);
          
          set((state) => {
            const invites = state.communityInvites[communityId] || [];
            state.communityInvites[communityId] = invites.filter(invite => invite.id !== inviteId);
            
            // Update pagination total
            const pagination = state.communityInvitesPagination[communityId];
            if (pagination) {
              pagination.total = Math.max(0, pagination.total - 1);
            }
          });

          console.log(`✅ [MemberStore] Revoked community invite successfully`);

        } catch (error: any) {
          console.error('❌ [MemberStore] Failed to revoke community invite:', error);
          set((state) => {
            state.memberActionError = error.message || 'Failed to revoke invite';
          });
          throw error;
        } finally {
          set((state) => {
            state.revokingInvite[actionKey] = false;
          });
        }
      },

      // ==================== UTILITY ACTIONS ====================

      clearMemberActionError: () => {
        set((state) => {
          state.memberActionError = null;
        });
      },

      clearCommunityMembersError: (communityId: string) => {
        set((state) => {
          state.communityMembersError[communityId] = null;
        });
      },

      clearSpaceMembersError: (spaceId: string) => {
        set((state) => {
          state.spaceMembersError[spaceId] = null;
        });
      },

      clearCommunityInvitesError: (communityId: string) => {
        set((state) => {
          state.communityInvitesError[communityId] = null;
        });
      },

      setMemberSearchQuery: (key: string, query: string) => {
        set((state) => {
          state.memberSearchQuery[key] = query;
        });
      },

      setMemberFilters: (key: string, filters: { role?: string; status?: string }) => {
        set((state) => {
          state.memberFilters[key] = filters;
        });
      },
    })),
    {
      name: 'member-management-store',
    }
  )
);

// Convenience hook for member management
export const useMemberManagement = () => {
  const store = useMemberManagementStore();
  
  return {
    // State
    communityMembers: store.communityMembers,
    spaceMembers: store.spaceMembers,
    communityInvites: store.communityInvites,
    
    // Loading states
    loadingCommunityMembers: store.loadingCommunityMembers,
    loadingSpaceMembers: store.loadingSpaceMembers,
    loadingCommunityInvites: store.loadingCommunityInvites,
    updatingMemberRole: store.updatingMemberRole,
    banningMember: store.banningMember,
    removingMember: store.removingMember,
    creatingInvite: store.creatingInvite,
    revokingInvite: store.revokingInvite,
    
    // Error states
    communityMembersError: store.communityMembersError,
    spaceMembersError: store.spaceMembersError,
    communityInvitesError: store.communityInvitesError,
    memberActionError: store.memberActionError,
    
    // Actions
    fetchCommunityMembers: store.fetchCommunityMembers,
    loadMoreCommunityMembers: store.loadMoreCommunityMembers,
    searchCommunityMembers: store.searchCommunityMembers,
    updateCommunityMemberRole: store.updateCommunityMemberRole,
    banCommunityMember: store.banCommunityMember,
    unbanCommunityMember: store.unbanCommunityMember,
    removeCommunityMember: store.removeCommunityMember,
    
    fetchSpaceMembers: store.fetchSpaceMembers,
    loadMoreSpaceMembers: store.loadMoreSpaceMembers,
    searchSpaceMembers: store.searchSpaceMembers,
    updateSpaceMemberRole: store.updateSpaceMemberRole,
    banSpaceMember: store.banSpaceMember,
    removeSpaceMember: store.removeSpaceMember,
    
    fetchCommunityInvites: store.fetchCommunityInvites,
    createCommunityInvite: store.createCommunityInvite,
    revokeCommunityInvite: store.revokeCommunityInvite,
    
    // Utility
    clearMemberActionError: store.clearMemberActionError,
    clearCommunityMembersError: store.clearCommunityMembersError,
    clearSpaceMembersError: store.clearSpaceMembersError,
    clearCommunityInvitesError: store.clearCommunityInvitesError,
    setMemberSearchQuery: store.setMemberSearchQuery,
    setMemberFilters: store.setMemberFilters,
  };
};
