import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import {
  communitySpaceApi,
  CommunitySpace,
  CommunityMembership,
  SpaceMembership,
  CreateSpaceRequest,
} from '../services/communitySpaceApi';

/**
 * ✅ COMMUNITY SPACE STORE
 * 
 * Manages community spaces, memberships, and permissions
 * Follows the same patterns as the existing community store
 */

interface CommunitySpaceState {
  // Data
  communitySpaces: Record<string, CommunitySpace[]>; // communityId -> spaces[]
  spaceMemberships: Record<string, SpaceMembership[]>; // communityId -> memberships[]
  communityMemberships: Record<string, CommunityMembership>; // communityId -> membership
  selectedSpace: CommunitySpace | null;

  // Loading states
  loading: boolean;
  spacesLoading: Record<string, boolean>; // communityId -> loading state
  joiningCommunity: Record<string, boolean>; // communityId -> joining state
  joiningSpace: Record<string, boolean>; // spaceId -> joining state
  creatingSpace: Record<string, boolean>; // communityId -> creating state

  // Error states
  error: string | null;
  spacesError: Record<string, string>; // communityId -> error message

  // Cache status
  fromCache: boolean;
  lastFetch: Record<string, number>; // communityId -> timestamp
}

interface CommunitySpaceActions {
  // Community Spaces
  fetchCommunitySpaces: (communityId: string) => Promise<void>;
  fetchSpaceById: (communityId: string, spaceId: string) => Promise<CommunitySpace | null>;
  refreshCommunitySpaces: (communityId: string) => Promise<void>;
  createSpace: (communityId: string, spaceData: CreateSpaceRequest) => Promise<CommunitySpace>;
  selectSpace: (space: CommunitySpace | null) => void;

  // Community Membership
  joinCommunity: (communityId: string, inviteCode?: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
  fetchCommunityMembership: (communityId: string) => Promise<void>;

  // Space Membership
  joinSpace: (communityId: string, spaceId: string) => Promise<void>;
  leaveSpace: (communityId: string, spaceId: string) => Promise<void>;
  fetchSpaceMemberships: (communityId: string) => Promise<void>;

  // Utility
  clearError: () => void;
  clearSpacesError: (communityId: string) => void;
  getCommunitySpaces: (communityId: string) => CommunitySpace[];
  getCommunityMembership: (communityId: string) => CommunityMembership | null;
  getSpaceMemberships: (communityId: string) => SpaceMembership[];
  canAccessCommunity: (communityId: string, userId?: string) => boolean;
  canCreateSpace: (communityId: string, userId?: string) => boolean;
}

type CommunitySpaceStore = CommunitySpaceState & CommunitySpaceActions;

const initialState: CommunitySpaceState = {
  // Data
  communitySpaces: {},
  spaceMemberships: {},
  communityMemberships: {},
  selectedSpace: null,

  // Loading states
  loading: false,
  spacesLoading: {},
  joiningCommunity: {},
  joiningSpace: {},
  creatingSpace: {},

  // Error states
  error: null,
  spacesError: {},

  // Cache status
  fromCache: false,
  lastFetch: {},
};

export const useCommunitySpaceStore = create<CommunitySpaceStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Community Spaces
      fetchCommunitySpaces: async (communityId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Fetching spaces for community: ${communityId}`);
        
        set((state) => {
          state.spacesLoading[communityId] = true;
          state.spacesError[communityId] = '';
        });

        try {
          const spaces = await communitySpaceApi.getCommunitySpaces(communityId);
          
          set((state) => {
            state.communitySpaces[communityId] = spaces;
            state.lastFetch[communityId] = Date.now();
            state.fromCache = false;
          });

          console.log(`✅ [CommunitySpaceStore] Fetched ${spaces.length} spaces`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch spaces';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.spacesError[communityId] = message;
          });
        } finally {
          set((state) => {
            state.spacesLoading[communityId] = false;
          });
        }
      },

      fetchSpaceById: async (communityId: string, spaceId: string) => {
        try {
          console.log(`🔄 [CommunitySpaceStore] Fetching space by ID: ${spaceId}`);

          // First check if space is already in cache
          const spaces = get().communitySpaces[communityId] || [];
          const existingSpace = spaces.find(s => s.id === spaceId);

          if (existingSpace) {
            console.log(`✅ [CommunitySpaceStore] Found space in cache: ${existingSpace.name}`);
            return existingSpace;
          }

          // Fetch from API
          const space = await communitySpaceApi.getSpaceById(communityId, spaceId);

          if (space) {
            // Add to cache
            set((state) => {
              if (!state.communitySpaces[communityId]) {
                state.communitySpaces[communityId] = [];
              }
              // Add if not already present
              const exists = state.communitySpaces[communityId].find(s => s.id === spaceId);
              if (!exists) {
                state.communitySpaces[communityId].push(space);
              }
            });

            console.log(`✅ [CommunitySpaceStore] Fetched space: ${space.name}`);
            return space;
          } else {
            console.log(`❌ [CommunitySpaceStore] Space not found: ${spaceId}`);
            return null;
          }
        } catch (error) {
          console.error('❌ [CommunitySpaceStore] Failed to fetch space by ID:', error);
          return null;
        }
      },

      refreshCommunitySpaces: async (communityId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Refreshing spaces for community: ${communityId}`);
        await get().fetchCommunitySpaces(communityId);
      },

      createSpace: async (communityId: string, spaceData: CreateSpaceRequest) => {
        console.log(`🔄 [CommunitySpaceStore] Creating space: ${spaceData.name}`);
        
        set((state) => {
          state.creatingSpace[communityId] = true;
          state.error = null;
        });

        try {
          const newSpace = await communitySpaceApi.createSpace(communityId, spaceData);
          
          set((state) => {
            if (!state.communitySpaces[communityId]) {
              state.communitySpaces[communityId] = [];
            }
            state.communitySpaces[communityId].unshift(newSpace);
          });

          console.log(`✅ [CommunitySpaceStore] Created space: ${newSpace.name}`);
          return newSpace;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create space';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.creatingSpace[communityId] = false;
          });
        }
      },

      selectSpace: (space: CommunitySpace | null) => {
        set((state) => {
          state.selectedSpace = space;
        });
      },

      // Community Membership
      joinCommunity: async (communityId: string, inviteCode?: string) => {
        console.log(`🔄 [CommunitySpaceStore] Joining community: ${communityId}`);
        
        set((state) => {
          state.joiningCommunity[communityId] = true;
          state.error = null;
        });

        try {
          const membership = await communitySpaceApi.joinCommunity(communityId, { inviteCode });
          
          set((state) => {
            state.communityMemberships[communityId] = membership;
          });

          console.log(`✅ [CommunitySpaceStore] Joined community successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join community';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.joiningCommunity[communityId] = false;
          });
        }
      },

      leaveCommunity: async (communityId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Leaving community: ${communityId}`);
        
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          await communitySpaceApi.leaveCommunity(communityId);
          
          set((state) => {
            delete state.communityMemberships[communityId];
            delete state.communitySpaces[communityId];
            delete state.spaceMemberships[communityId];
          });

          console.log(`✅ [CommunitySpaceStore] Left community successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to leave community';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.loading = false;
          });
        }
      },

      fetchCommunityMembership: async (communityId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Fetching community membership: ${communityId}`);
        
        try {
          // This would typically be part of the community details API call
          // For now, we'll assume membership is set when joining
          console.log(`✅ [CommunitySpaceStore] Community membership check complete`);
        } catch (error) {
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
        }
      },

      // Space Membership
      joinSpace: async (communityId: string, spaceId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Joining space: ${spaceId}`);
        
        set((state) => {
          state.joiningSpace[spaceId] = true;
          state.error = null;
        });

        try {
          const membership = await communitySpaceApi.joinSpace(communityId, spaceId);
          
          set((state) => {
            if (!state.spaceMemberships[communityId]) {
              state.spaceMemberships[communityId] = [];
            }
            state.spaceMemberships[communityId].push(membership);
            
            // Update space isJoined status
            const spaces = state.communitySpaces[communityId];
            if (spaces) {
              const space = spaces.find(s => s.id === spaceId);
              if (space) {
                space.isJoined = true;
                space.memberCount = (space.memberCount || 0) + 1;
                console.log(`✅ [CommunitySpaceStore] Updated space isJoined: ${space.isJoined}`);
              }
            }
          });

          console.log(`✅ [CommunitySpaceStore] Joined space successfully`);

          // ✅ REFRESH: Update space data to ensure UI consistency
          try {
            await get().fetchCommunitySpaces(communityId);
            console.log(`✅ [CommunitySpaceStore] Space data refreshed after join`);
          } catch (refreshError) {
            console.error(`⚠️ [CommunitySpaceStore] Failed to refresh space data:`, refreshError);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join space';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.joiningSpace[spaceId] = false;
          });
        }
      },

      leaveSpace: async (communityId: string, spaceId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Leaving space: ${spaceId}`);
        
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          await communitySpaceApi.leaveSpace(communityId, spaceId);
          
          set((state) => {
            // Remove membership
            if (state.spaceMemberships[communityId]) {
              state.spaceMemberships[communityId] = state.spaceMemberships[communityId]
                .filter(m => m.spaceId !== spaceId);
            }
            
            // Update space isJoined status
            const spaces = state.communitySpaces[communityId];
            if (spaces) {
              const space = spaces.find(s => s.id === spaceId);
              if (space) {
                space.isJoined = false;
              }
            }
          });

          console.log(`✅ [CommunitySpaceStore] Left space successfully`);

          // ✅ REFRESH: Update space data to ensure UI consistency
          try {
            await get().fetchCommunitySpaces(communityId);
            console.log(`✅ [CommunitySpaceStore] Space data refreshed after leave`);
          } catch (refreshError) {
            console.error(`⚠️ [CommunitySpaceStore] Failed to refresh space data:`, refreshError);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to leave space';
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.loading = false;
          });
        }
      },

      fetchSpaceMemberships: async (communityId: string) => {
        console.log(`🔄 [CommunitySpaceStore] Fetching space memberships: ${communityId}`);
        
        try {
          const memberships = await communitySpaceApi.getUserSpaceMemberships(communityId);
          
          set((state) => {
            state.spaceMemberships[communityId] = memberships;
          });

          console.log(`✅ [CommunitySpaceStore] Fetched ${memberships.length} memberships`);
        } catch (error) {
          console.error(`❌ [CommunitySpaceStore] Error:`, error);
        }
      },

      // Utility functions
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      clearSpacesError: (communityId: string) => {
        set((state) => {
          state.spacesError[communityId] = '';
        });
      },

      getCommunitySpaces: (communityId: string) => {
        return get().communitySpaces[communityId] || [];
      },

      getCommunityMembership: (communityId: string) => {
        return get().communityMemberships[communityId] || null;
      },

      getSpaceMemberships: (communityId: string) => {
        return get().spaceMemberships[communityId] || [];
      },

      canAccessCommunity: (communityId: string, userId?: string) => {
        const membership = get().communityMemberships[communityId];
        return membership?.isActive || false;
      },

      canCreateSpace: (communityId: string, userId?: string) => {
        const membership = get().communityMemberships[communityId];
        if (!membership) return false;
        
        return ['owner', 'admin', 'moderator'].includes(membership.role);
      },
    })),
    {
      name: 'community-space-store',
    }
  )
);

// Selectors for easy access
export const selectCommunitySpaces = (communityId: string) => (state: CommunitySpaceStore) =>
  state.communitySpaces[communityId] || [];

export const selectSpacesLoading = (communityId: string) => (state: CommunitySpaceStore) =>
  state.spacesLoading[communityId] || false;

export const selectSpacesError = (communityId: string) => (state: CommunitySpaceStore) =>
  state.spacesError[communityId] || '';

export const selectCommunityMembership = (communityId: string) => (state: CommunitySpaceStore) =>
  state.communityMemberships[communityId] || null;

export const selectCanCreateSpace = (communityId: string) => (state: CommunitySpaceStore) =>
  state.canCreateSpace(communityId);

// Actions for external use
export const communitySpaceActions = {
  fetchCommunitySpaces: (communityId: string) =>
    useCommunitySpaceStore.getState().fetchCommunitySpaces(communityId),
  
  refreshCommunitySpaces: (communityId: string) =>
    useCommunitySpaceStore.getState().refreshCommunitySpaces(communityId),
  
  createSpace: (communityId: string, spaceData: CreateSpaceRequest) =>
    useCommunitySpaceStore.getState().createSpace(communityId, spaceData),
  
  joinCommunity: (communityId: string, inviteCode?: string) =>
    useCommunitySpaceStore.getState().joinCommunity(communityId, inviteCode),
  
  leaveCommunity: (communityId: string) =>
    useCommunitySpaceStore.getState().leaveCommunity(communityId),
  
  joinSpace: (communityId: string, spaceId: string) =>
    useCommunitySpaceStore.getState().joinSpace(communityId, spaceId),
  
  leaveSpace: (communityId: string, spaceId: string) =>
    useCommunitySpaceStore.getState().leaveSpace(communityId, spaceId),
  
  selectSpace: (space: CommunitySpace | null) =>
    useCommunitySpaceStore.getState().selectSpace(space),
};

// Hook wrapper for easy usage (matching existing pattern)
export const useSpaces = () => {
  const spaceStore = useCommunitySpaceStore();
  return {
    // State
    communitySpaces: spaceStore.communitySpaces,
    spaceMemberships: spaceStore.spaceMemberships,
    communityMemberships: spaceStore.communityMemberships,
    selectedSpace: spaceStore.selectedSpace,
    isLoading: spaceStore.loading,
    spacesLoading: spaceStore.spacesLoading,
    error: spaceStore.error,

    // Actions
    fetchCommunitySpaces: spaceStore.fetchCommunitySpaces,
    refreshCommunitySpaces: spaceStore.refreshCommunitySpaces,
    createSpace: spaceStore.createSpace,
    selectSpace: spaceStore.selectSpace,
    joinCommunity: spaceStore.joinCommunity,
    leaveCommunity: spaceStore.leaveCommunity,
    joinSpace: spaceStore.joinSpace,
    leaveSpace: spaceStore.leaveSpace,
    fetchCommunityMembership: spaceStore.fetchCommunityMembership,
    fetchSpaceMemberships: spaceStore.fetchSpaceMemberships,
    clearError: spaceStore.clearError,
    clearSpacesError: spaceStore.clearSpacesError,
    getCommunitySpaces: spaceStore.getCommunitySpaces,
    getCommunityMembership: spaceStore.getCommunityMembership,
    getSpaceMemberships: spaceStore.getSpaceMemberships,
    canAccessCommunity: spaceStore.canAccessCommunity,
    canCreateSpace: spaceStore.canCreateSpace,
  };
};
