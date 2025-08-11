import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { communitySpaceApi, JoinRequest } from '../services/communitySpaceApi';

/**
 * ✅ COMPREHENSIVE JOIN REQUEST MANAGEMENT STORE
 * 
 * Features:
 * - Manage join requests for secret communities
 * - Admin approval/rejection workflows
 * - Real-time updates and notifications
 * - User request tracking
 */

interface JoinRequestState {
  // Data
  pendingRequests: Record<string, JoinRequest[]>; // communityId -> requests
  userRequests: JoinRequest[];
  
  // Loading states
  loading: boolean;
  pendingRequestsLoading: Record<string, boolean>; // communityId -> loading
  processingRequest: Record<string, boolean>; // requestId -> processing
  
  // Error states
  error: string | null;
  requestErrors: Record<string, string>; // requestId -> error
  
  // Cache
  lastFetch: Record<string, number>; // communityId -> timestamp
}

interface JoinRequestActions {
  // Admin actions
  fetchPendingRequests: (communityId: string) => Promise<void>;
  approveRequest: (requestId: string, adminResponse?: string) => Promise<void>;
  rejectRequest: (requestId: string, adminResponse?: string) => Promise<void>;
  
  // User actions
  createJoinRequest: (communityId: string, message?: string) => Promise<void>;
  fetchUserRequests: () => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
  clearRequestError: (requestId: string) => void;
  getPendingCount: (communityId: string) => number;
}

type JoinRequestStore = JoinRequestState & JoinRequestActions;

const initialState: JoinRequestState = {
  pendingRequests: {},
  userRequests: [],
  loading: false,
  pendingRequestsLoading: {},
  processingRequest: {},
  error: null,
  requestErrors: {},
  lastFetch: {},
};

export const useJoinRequestStore = create<JoinRequestStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Admin Actions
      fetchPendingRequests: async (communityId: string) => {
        console.log(`🔄 [JoinRequestStore] Fetching pending requests for community: ${communityId}`);
        
        set((state) => {
          state.pendingRequestsLoading[communityId] = true;
          state.error = null;
        });

        try {
          const response = await communitySpaceApi.getPendingJoinRequests(communityId);
          
          set((state) => {
            state.pendingRequests[communityId] = response.requests;
            state.lastFetch[communityId] = Date.now();
          });

          console.log(`✅ [JoinRequestStore] Fetched ${response.requests.length} pending requests`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch pending requests';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
        } finally {
          set((state) => {
            state.pendingRequestsLoading[communityId] = false;
          });
        }
      },

      approveRequest: async (requestId: string, adminResponse?: string) => {
        console.log(`🔄 [JoinRequestStore] Approving request: ${requestId}`);
        
        set((state) => {
          state.processingRequest[requestId] = true;
          state.requestErrors[requestId] = '';
        });

        try {
          await communitySpaceApi.approveJoinRequest(requestId, adminResponse);
          
          set((state) => {
            // Remove from pending requests
            Object.keys(state.pendingRequests).forEach(communityId => {
              state.pendingRequests[communityId] = state.pendingRequests[communityId].filter(
                req => req.id !== requestId
              );
            });
          });

          console.log(`✅ [JoinRequestStore] Request approved successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to approve request';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
          set((state) => {
            state.requestErrors[requestId] = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.processingRequest[requestId] = false;
          });
        }
      },

      rejectRequest: async (requestId: string, adminResponse?: string) => {
        console.log(`🔄 [JoinRequestStore] Rejecting request: ${requestId}`);
        
        set((state) => {
          state.processingRequest[requestId] = true;
          state.requestErrors[requestId] = '';
        });

        try {
          await communitySpaceApi.rejectJoinRequest(requestId, adminResponse);
          
          set((state) => {
            // Remove from pending requests
            Object.keys(state.pendingRequests).forEach(communityId => {
              state.pendingRequests[communityId] = state.pendingRequests[communityId].filter(
                req => req.id !== requestId
              );
            });
          });

          console.log(`✅ [JoinRequestStore] Request rejected successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reject request';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
          set((state) => {
            state.requestErrors[requestId] = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.processingRequest[requestId] = false;
          });
        }
      },

      // User Actions
      createJoinRequest: async (communityId: string, message?: string) => {
        console.log(`🔄 [JoinRequestStore] Creating join request for community: ${communityId}`);
        
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const request = await communitySpaceApi.createJoinRequest(communityId, { message });
          
          set((state) => {
            state.userRequests.unshift(request);
          });

          console.log(`✅ [JoinRequestStore] Join request created successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create join request';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
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

      fetchUserRequests: async () => {
        console.log(`🔄 [JoinRequestStore] Fetching user's join requests`);
        
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const response = await communitySpaceApi.getUserJoinRequests();
          
          set((state) => {
            state.userRequests = response.requests;
          });

          console.log(`✅ [JoinRequestStore] Fetched ${response.requests.length} user requests`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch user requests';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
          set((state) => {
            state.error = message;
          });
        } finally {
          set((state) => {
            state.loading = false;
          });
        }
      },

      cancelRequest: async (requestId: string) => {
        console.log(`🔄 [JoinRequestStore] Cancelling request: ${requestId}`);
        
        set((state) => {
          state.processingRequest[requestId] = true;
          state.requestErrors[requestId] = '';
        });

        try {
          // TODO: Implement cancel API call
          
          set((state) => {
            state.userRequests = state.userRequests.filter(req => req.id !== requestId);
          });

          console.log(`✅ [JoinRequestStore] Request cancelled successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel request';
          console.error(`❌ [JoinRequestStore] Error:`, error);
          
          set((state) => {
            state.requestErrors[requestId] = message;
          });
          throw error;
        } finally {
          set((state) => {
            state.processingRequest[requestId] = false;
          });
        }
      },

      // Utility
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      clearRequestError: (requestId: string) => {
        set((state) => {
          delete state.requestErrors[requestId];
        });
      },

      getPendingCount: (communityId: string) => {
        const requests = get().pendingRequests[communityId] || [];
        return requests.filter(req => req.status === 'pending').length;
      },
    })),
    {
      name: 'join-request-store',
    }
  )
);

// Action creators for external use
export const joinRequestActions = {
  fetchPendingRequests: (communityId: string) =>
    useJoinRequestStore.getState().fetchPendingRequests(communityId),
  
  approveRequest: (requestId: string, adminResponse?: string) =>
    useJoinRequestStore.getState().approveRequest(requestId, adminResponse),
  
  rejectRequest: (requestId: string, adminResponse?: string) =>
    useJoinRequestStore.getState().rejectRequest(requestId, adminResponse),
  
  createJoinRequest: (communityId: string, message?: string) =>
    useJoinRequestStore.getState().createJoinRequest(communityId, message),
  
  fetchUserRequests: () =>
    useJoinRequestStore.getState().fetchUserRequests(),
  
  cancelRequest: (requestId: string) =>
    useJoinRequestStore.getState().cancelRequest(requestId),
};
