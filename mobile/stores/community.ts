import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { sqliteCommunityCache } from './sqliteCommunityCache';
import { useApiStore, ApiResponse } from './api';
import { socketService } from './socket';

/**
 * ✅ ENTERPRISE-GRADE COMMUNITY STORE
 * 
 * Features:
 * - Instant loading from SQLite cache
 * - Background refresh with delta sync
 * - Optimistic updates for UI responsiveness
 * - Preloading of related data
 * - Comprehensive error handling
 * - Real-time updates via WebSocket
 */

export interface Community {
  // Core fields (matching backend entity exactly)
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  type: 'public' | 'private' | 'secret';
  interactionType: 'post' | 'chat' | 'hybrid';
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  joinRequirement: 'open' | 'approval_required' | 'invite_only';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'partner';
  ownerId: string;

  // Community Settings & Configuration
  allowInvites: boolean;
  allowMemberInvites: boolean;
  requireEmailVerification: boolean;
  minimumAge: number;
  maxMembers?: number;
  allowSpaceCreation: boolean;
  allowFileUploads: boolean;
  maxFileSize: number;

  // Moderation Settings
  enableSlowMode: boolean;
  slowModeDelay: number;
  enableWordFilter: boolean;
  bannedWords: string[];
  requireMessageApproval: boolean;
  enableRaidProtection: boolean;

  // Statistics & Enhanced Metadata
  spaceCount: number;
  activeMembersToday: number;
  messageCount: number;

  // SEO & Discovery
  keywords: string[];
  isFeatured: boolean;
  isTrending: boolean;
  isPlatformVerified: boolean;

  // External Links
  website?: string;
  discordUrl?: string;
  twitterHandle?: string;
  githubOrg?: string;

  // Member count
  memberCount: number;

  // Settings & Metadata
  settings: Record<string, any>;
  metadata: Record<string, any>;

  // Virtual fields - added by API responses for user context
  isJoined?: boolean;
  isOwner?: boolean;
  memberRole?: string; // from CommunityMember relationship

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface CommunityState {
  // Data - matching the working implementation structure
  communities: Community[]; // All/discover communities
  joinedCommunities: Community[]; // Communities user has joined
  ownedCommunities: Community[]; // Communities user owns
  selectedCommunity: Community | null;

  // Loading states
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Cache status
  fromCache: boolean;
  lastRefresh: number;

  // Background operations
  preloadingSpaces: boolean;
  syncInProgress: boolean;
}

interface CommunityActions {
  // Core actions - matching the working implementation
  fetchCommunities: (filters?: { category?: string; search?: string }) => Promise<void>;
  fetchCommunityById: (id: string, forceRefresh?: boolean) => Promise<Community | null>;
  fetchJoinedCommunities: () => Promise<void>;
  fetchOwnedCommunities: () => Promise<void>;
  refreshCommunities: () => Promise<void>;
  selectCommunity: (community: Community) => void;

  // Background operations
  prewarmSpaces: (communityIds: string[]) => Promise<void>;
  syncWithServer: () => Promise<void>;

  // Optimistic updates
  updateCommunityOptimistic: (communityId: string, updates: Partial<Community>) => void;
  incrementMessageCount: (communityId: string) => void;
  updateMemberCount: (communityId: string, increment: number) => void;

  // Community membership actions
  joinCommunity: (communityId: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;

  // Utility actions
  clearError: () => void;
  reset: () => void;

  // WebSocket integration
  initializeWebSocketListeners: () => void;
}

type CommunityStore = CommunityState & CommunityActions;

const initialState: CommunityState = {
  communities: [],
  joinedCommunities: [],
  ownedCommunities: [],
  selectedCommunity: null,
  loading: false,
  refreshing: false,
  error: null,
  fromCache: false,
  lastRefresh: 0,
  preloadingSpaces: false,
  syncInProgress: false,
};

export const useCommunityStore = create<CommunityStore>()(
  devtools(
    immer((set, get) => ({
    ...initialState,

    /**
     * ✅ FETCH ALL/DISCOVER COMMUNITIES - Matching working implementation
     */
    fetchCommunities: async (filters = {}) => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const apiStore = useApiStore.getState();
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);

        const queryString = params.toString();
        const url = queryString ? `/communities?${queryString}` : '/communities';
        const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number }>>(url);

        if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
          // Get current joined communities to set isJoined flag
          const currentState = get();
          const joinedCommunityIds = new Set(currentState.joinedCommunities.map(c => c.id));

          const communitiesWithJoinStatus = response.data.communities.map(community => ({
            ...community,
            isJoined: joinedCommunityIds.has(community.id)
          }));

          set((state) => {
            state.communities = communitiesWithJoinStatus;
            state.loading = false;
          });

          // Sync with cache
          await sqliteCommunityCache.syncCommunities(communitiesWithJoinStatus);

        } else {
          set((state) => {
            state.communities = [];
            state.loading = false;
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch communities';
        set((state) => {
          state.error = message;
          state.communities = [];
          state.loading = false;
        });
      }
    },

    /**
     * ✅ FETCH COMMUNITY BY ID - For info screens
     */
    fetchCommunityById: async (id: string, forceRefresh: boolean = false) => {
      try {
        console.log(`🔄 [CommunityStore] Fetching community by ID: ${id} (forceRefresh: ${forceRefresh})`);

        // Skip cache if forceRefresh is true
        if (!forceRefresh) {
          // First check if community is already in any of our arrays
          const { communities, joinedCommunities, ownedCommunities } = get();
          let existingCommunity = communities.find(c => c.id === id) ||
                                 joinedCommunities.find(c => c.id === id) ||
                                 ownedCommunities.find(c => c.id === id);

          if (existingCommunity) {
            console.log(`✅ [CommunityStore] Found community in cache: ${existingCommunity.name}`);
            return existingCommunity;
          }
        }

        // Fetch from API
        const apiStore = useApiStore.getState();
        const response = await apiStore.get<ApiResponse<Community>>(`/communities/${id}`);

        if (response.success && response.data) {
          console.log(`✅ [CommunityStore] Fetched community: ${response.data.name} (memberRole: ${response.data.memberRole})`);

          // Update the community in all relevant arrays
          set((state) => {
            const updateCommunityInArray = (array: Community[]) => {
              const index = array.findIndex(c => c.id === id);
              if (index !== -1) {
                array[index] = response.data!;
              }
            };

            updateCommunityInArray(state.communities);
            updateCommunityInArray(state.joinedCommunities);
            updateCommunityInArray(state.ownedCommunities);
          });

          return response.data;
        } else {
          throw new Error(response.message || 'Community not found');
        }
      } catch (error) {
        console.error('❌ [CommunityStore] Failed to fetch community by ID:', error);
        return null;
      }
    },

    /**
     * ✅ FETCH JOINED COMMUNITIES - Matching working implementation
     */
    fetchJoinedCommunities: async () => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const apiStore = useApiStore.getState();
        const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number; page: number; limit: number }>>('/communities/me/joined');

        if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
          const joinedCommunitiesWithStatus = response.data.communities.map(community => ({
            ...community,
            isJoined: true
          }));

          set((state) => {
            // Update main communities list with joined status
            const joinedIds = new Set(joinedCommunitiesWithStatus.map(c => c.id));
            const updatedCommunities = state.communities.map(community => ({
              ...community,
              isJoined: joinedIds.has(community.id)
            }));

            state.joinedCommunities = joinedCommunitiesWithStatus;
            state.communities = updatedCommunities;
            state.loading = false;
            state.fromCache = false;
          });

          // Sync with cache
          await sqliteCommunityCache.syncCommunities(joinedCommunitiesWithStatus);

        } else {
          set((state) => {
            state.joinedCommunities = [];
            state.loading = false;
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch joined communities';
        set((state) => {
          state.error = message;
          state.joinedCommunities = [];
          state.loading = false;
        });
      }
    },

    /**
     * ✅ FETCH OWNED COMMUNITIES - Matching working implementation
     */
    fetchOwnedCommunities: async () => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const apiStore = useApiStore.getState();
        const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number; page: number; limit: number }>>('/communities/me/owned');

        if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
          const ownedCommunities = response.data.communities;
          set((state) => {
            state.ownedCommunities = ownedCommunities;
            state.loading = false;
          });

          // Sync with cache
          await sqliteCommunityCache.syncCommunities(ownedCommunities);

        } else {
          set((state) => {
            state.ownedCommunities = [];
            state.loading = false;
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch owned communities';
        set((state) => {
          state.error = message;
          state.ownedCommunities = [];
          state.loading = false;
        });
      }
    },

    /**
     * ✅ PULL-TO-REFRESH - Force refresh from server
     */
    refreshCommunities: async () => {
      set((state) => {
        state.refreshing = true;
        state.error = null;
      });

      try {
        console.log('🔄 [CommunityStore] Refreshing communities from server...');
        
        await get().syncWithServer();
        
        set((state) => {
          state.refreshing = false;
          state.lastRefresh = Date.now();
        });

      } catch (error) {
        console.error('❌ [CommunityStore] Failed to refresh communities:', error);
        
        set((state) => {
          state.refreshing = false;
          state.error = error instanceof Error ? error.message : 'Failed to refresh communities';
        });
      }
    },

    /**
     * ✅ BACKGROUND SYNC - Sync with server without blocking UI
     */
    syncWithServer: async () => {
      if (get().syncInProgress) {
        console.log('⏭️ [CommunityStore] Sync already in progress, skipping...');
        return;
      }

      set((state) => {
        state.syncInProgress = true;
      });

      try {
        const apiStore = useApiStore.getState();

        // Fetch joined communities from backend (matches existing API pattern)
        const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number; page: number; limit: number }>>('/communities/me/joined');

        if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
          const communities = response.data.communities.map(community => ({
            ...community,
            isJoined: true
          }));

          // Sync with SQLite cache
          await sqliteCommunityCache.syncCommunities(communities);

          // Update store with fresh data
          set((state) => {
            state.communities = communities;
            state.fromCache = false;
            state.lastRefresh = Date.now();
            state.loading = false;
          });

          console.log(`✅ [CommunityStore] Synced ${communities.length} communities with server`);
        }

      } catch (error) {
        console.error('❌ [CommunityStore] Failed to sync with server:', error);

        // Don't set error state for background sync failures
        // The UI should continue working with cached data
        set((state) => {
          state.loading = false;
        });
      } finally {
        set((state) => {
          state.syncInProgress = false;
        });
      }
    },

    /**
     * ✅ PRELOAD SPACES - Background load spaces for better UX
     */
    prewarmSpaces: async (communityIds: string[]) => {
      if (get().preloadingSpaces) {
        return;
      }

      set((state) => {
        state.preloadingSpaces = true;
      });

      try {
        console.log(`🔄 [CommunityStore] Prewarming spaces for ${communityIds.length} communities...`);
        
        // Preload spaces in SQLite cache
        await sqliteCommunityCache.preloadSpaces(communityIds);
        
        // TODO: Also preload space data from backend
        // This would be done in parallel with space store
        
        console.log('✅ [CommunityStore] Space prewarming completed');

      } catch (error) {
        console.error('❌ [CommunityStore] Failed to prewarm spaces:', error);
      } finally {
        set((state) => {
          state.preloadingSpaces = false;
        });
      }
    },

    /**
     * ✅ SELECT COMMUNITY - Set active community
     */
    selectCommunity: (community: Community) => {
      set((state) => {
        state.selectedCommunity = community;
      });

      console.log(`✅ [CommunityStore] Selected community: ${community.name}`);
    },

    /**
     * ✅ OPTIMISTIC UPDATES - Update UI immediately
     */
    updateCommunityOptimistic: (communityId: string, updates: Partial<Community>) => {
      set((state) => {
        const index = state.communities.findIndex(c => c.id === communityId);
        if (index !== -1) {
          state.communities[index] = { ...state.communities[index], ...updates };
        }
        
        if (state.selectedCommunity?.id === communityId) {
          state.selectedCommunity = { ...state.selectedCommunity, ...updates };
        }
      });

      console.log(`✅ [CommunityStore] Optimistically updated community ${communityId}`);
    },

    /**
     * ✅ COMMUNITY STATS MANAGEMENT
     */
    incrementMessageCount: (communityId: string) => {
      set((state) => {
        const community = state.communities.find(c => c.id === communityId);
        if (community) {
          community.messageCount++;
        }
      });
    },

    updateMemberCount: (communityId: string, increment: number) => {
      set((state) => {
        const community = state.communities.find(c => c.id === communityId);
        if (community) {
          community.memberCount = Math.max(0, community.memberCount + increment);
        }
      });
    },

    /**
     * ✅ UTILITY ACTIONS
     */
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    reset: () => {
      set(() => ({ ...initialState }));
    },

    /**
     * ✅ JOIN COMMUNITY - Comprehensive membership management
     */
    joinCommunity: async (communityId: string) => {
      try {
        // Use the dedicated community space API for proper response handling
        const { communitySpaceApi } = await import('../services/communitySpaceApi');
        const membership = await communitySpaceApi.joinCommunity(communityId);

        set((state) => {
          // Update communities array
          const communityIndex = state.communities.findIndex(c => c.id === communityId);
          console.log(`🔍 [CommunityStore] Updating community at index ${communityIndex}`);
          if (communityIndex !== -1) {
            state.communities[communityIndex].isJoined = true;
            state.communities[communityIndex].memberCount = (state.communities[communityIndex].memberCount || 0) + 1;
            console.log(`✅ [CommunityStore] Updated communities array: isJoined=${state.communities[communityIndex].isJoined}`);
          }

          // Add to joined communities if not already there
          const joinedIndex = state.joinedCommunities.findIndex(c => c.id === communityId);
          if (joinedIndex === -1) {
            const community = state.communities.find(c => c.id === communityId);
            if (community) {
              state.joinedCommunities.push({ ...community, isJoined: true });
              console.log(`✅ [CommunityStore] Added to joinedCommunities array`);
            }
          }

          // Update selected community if it's the current one
          if (state.selectedCommunity?.id === communityId) {
            state.selectedCommunity.isJoined = true;
            state.selectedCommunity.memberCount = (state.selectedCommunity.memberCount || 0) + 1;
            console.log(`✅ [CommunityStore] Updated selectedCommunity: isJoined=${state.selectedCommunity.isJoined}`);
          }
        });

        console.log(`✅ [CommunityStore] Successfully joined community: ${communityId}`, membership);
      } catch (error) {
        console.error(`❌ [CommunityStore] Failed to join community:`, error);
        throw error;
      }
    },

    /**
     * ✅ LEAVE COMMUNITY - Comprehensive membership management
     */
    leaveCommunity: async (communityId: string) => {
      try {
        const apiStore = useApiStore.getState();
        const response = await apiStore.delete<ApiResponse>(`/communities/${communityId}/leave`);

        if (response.success) {
          set((state) => {
            // Update communities array
            const communityIndex = state.communities.findIndex(c => c.id === communityId);
            if (communityIndex !== -1) {
              state.communities[communityIndex].isJoined = false;
              state.communities[communityIndex].memberCount = Math.max(0, (state.communities[communityIndex].memberCount || 1) - 1);
            }

            // Remove from joined communities
            state.joinedCommunities = state.joinedCommunities.filter(c => c.id !== communityId);

            // Update selected community if it's the current one
            if (state.selectedCommunity?.id === communityId) {
              state.selectedCommunity.isJoined = false;
              state.selectedCommunity.memberCount = Math.max(0, (state.selectedCommunity.memberCount || 1) - 1);
            }
          });

          console.log(`✅ [CommunityStore] Successfully left community: ${communityId}`);
        } else {
          throw new Error(response.message || 'Failed to leave community');
        }
      } catch (error) {
        console.error(`❌ [CommunityStore] Failed to leave community:`, error);
        throw error;
      }
    },

    /**
     * ✅ WEBSOCKET INTEGRATION - Set up real-time listeners
     */
    initializeWebSocketListeners: () => {
      socketService.setEventHandlers({
        onCommunityUpdate: (data) => {
          console.log('🔄 [CommunityStore] Community updated via WebSocket:', data);
          get().updateCommunityOptimistic(data.communityId, data.updates);
        },
        onMemberJoined: (data) => {
          console.log('👋 [CommunityStore] Member joined via WebSocket:', data);
          get().updateMemberCount(data.communityId, 1);
        },
        onMemberLeft: (data) => {
          console.log('👋 [CommunityStore] Member left via WebSocket:', data);
          get().updateMemberCount(data.communityId, -1);
        },
      });
    },
  })),
    {
      name: 'community-store',
    }
  )
);

// Selectors for optimized re-renders
export const selectCommunities = (state: CommunityStore) => state.communities;
export const selectSelectedCommunity = (state: CommunityStore) => state.selectedCommunity;
export const selectLoading = (state: CommunityStore) => state.loading;
export const selectRefreshing = (state: CommunityStore) => state.refreshing;
export const selectError = (state: CommunityStore) => state.error;
export const selectFromCache = (state: CommunityStore) => state.fromCache;

// Computed selectors
export const selectActiveCommunities = (state: CommunityStore) => 
  state.communities.filter(c => c.status === 'active');

export const selectCommunitiesWithActivity = (state: CommunityStore) =>
  state.communities.filter(c =>
    c.messageCount > 0 || c.activeMembersToday > 0
  );

export const selectCommunityById = (communityId: string) => (state: CommunityStore) =>
  state.communities.find(c => c.id === communityId);

// Action creators for external use
export const communityActions = {
  fetchCommunities: (filters?: { category?: string; search?: string }) =>
    useCommunityStore.getState().fetchCommunities(filters),
  fetchJoinedCommunities: () => useCommunityStore.getState().fetchJoinedCommunities(),
  fetchOwnedCommunities: () => useCommunityStore.getState().fetchOwnedCommunities(),
  refreshCommunities: () => useCommunityStore.getState().refreshCommunities(),
  selectCommunity: (community: Community) => useCommunityStore.getState().selectCommunity(community),
  prewarmSpaces: (communityIds: string[]) => useCommunityStore.getState().prewarmSpaces(communityIds),
  updateCommunityOptimistic: (communityId: string, updates: Partial<Community>) =>
    useCommunityStore.getState().updateCommunityOptimistic(communityId, updates),
  incrementMessageCount: (communityId: string) =>
    useCommunityStore.getState().incrementMessageCount(communityId),
  updateMemberCount: (communityId: string, increment: number) =>
    useCommunityStore.getState().updateMemberCount(communityId, increment),
  initializeWebSocketListeners: () => useCommunityStore.getState().initializeWebSocketListeners(),
  clearError: () => useCommunityStore.getState().clearError(),
  reset: () => useCommunityStore.getState().reset(),
};

// Hook wrapper for easy usage (matching existing pattern)
export const useCommunities = () => {
  const communityStore = useCommunityStore();
  return {
    // State
    communities: communityStore.communities,
    joinedCommunities: communityStore.joinedCommunities,
    ownedCommunities: communityStore.ownedCommunities,
    selectedCommunity: communityStore.selectedCommunity,
    isLoading: communityStore.loading,
    error: communityStore.error,

    // Actions
    fetchCommunities: communityStore.fetchCommunities,
    fetchJoinedCommunities: communityStore.fetchJoinedCommunities,
    fetchOwnedCommunities: communityStore.fetchOwnedCommunities,
    refreshCommunities: communityStore.refreshCommunities,
    selectCommunity: communityStore.selectCommunity,
    joinCommunity: communityStore.joinCommunity,
    leaveCommunity: communityStore.leaveCommunity,
    updateCommunityOptimistic: communityStore.updateCommunityOptimistic,
    incrementMessageCount: communityStore.incrementMessageCount,
    updateMemberCount: communityStore.updateMemberCount,
    clearError: communityStore.clearError,
    reset: communityStore.reset,
  };
};
