import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiStore, ApiResponse, PaginatedResponse } from './api';

// Types for posts and communities
export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  authorId: string;
  author: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  featuredImage?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  slug: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  type: 'public' | 'private' | 'secret';
  interactionType: 'post' | 'chat' | 'hybrid';
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  joinRequirement: 'open' | 'approval_required' | 'invite_only';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'partner';
  ownerId: string;
  memberCount: number;
  spaceCount: number;
  messageCount: number;
  activeMembersToday: number;
  isFeatured: boolean;
  isTrending: boolean;
  isPlatformVerified: boolean;
  allowInvites: boolean;
  allowMemberInvites: boolean;
  allowSpaceCreation: boolean;
  maxMembers?: number;
  website?: string;
  discordUrl?: string;
  twitterHandle?: string;
  githubOrg?: string;
  keywords: string[];
  // Virtual fields that may be added by the API
  isJoined?: boolean;
  isOwner?: boolean;
  memberRole?: 'owner' | 'admin' | 'moderator' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface Space {
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
  position: number;
  // Virtual fields
  unreadCount?: number;
  isJoined?: boolean;
  memberRole?: 'owner' | 'admin' | 'moderator' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityData {
  name: string;
  description: string;
  type: 'public' | 'private' | 'secret';
  interactionType?: 'post' | 'chat' | 'hybrid';
  avatarUrl?: string;
  coverImageUrl?: string;
}

export interface CreateSpaceData {
  name: string;
  description?: string;
  communityId: string;
  type: 'public' | 'private' | 'secret';
  interactionType?: 'post' | 'chat' | 'forum' | 'feed';
  category: 'general' | 'announcements' | 'discussion' | 'projects' | 'support' | 'social' | 'gaming' | 'tech' | 'creative' | 'education' | 'business' | 'entertainment' | 'sports' | 'news' | 'other';
  avatarUrl?: string;
  bannerUrl?: string;
  maxMembers?: number;
  allowMemberInvites?: boolean;
  requireApproval?: boolean;
}

export interface CreatePostData {
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  status: 'draft' | 'published';
  featuredImage?: string;
}

export interface CreateSpacePostData {
  title: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'link' | 'poll' | 'event' | 'document';
  // Media attachments
  images?: {
    url: string;
    caption?: string;
    alt?: string;
  }[];
  videos?: {
    url: string;
    thumbnail?: string;
    caption?: string;
    duration?: number;
  }[];
  documents?: {
    url: string;
    name: string;
    size: number;
    type: string;
  }[];
  // Link preview
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  };
  // Poll data
  poll?: {
    question: string;
    options: string[];
    allowMultiple?: boolean;
    expiresAt?: string;
  };
  // Event data
  event?: {
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    location?: string;
    isOnline?: boolean;
    meetingLink?: string;
  };
  // Formatting options
  formatting?: {
    isBold?: boolean;
    isItalic?: boolean;
    hasCodeBlock?: boolean;
    hasMentions?: boolean;
    hasHashtags?: boolean;
  };
  // Privacy and interaction settings
  settings?: {
    allowComments?: boolean;
    allowReactions?: boolean;
    isPinned?: boolean;
    isAnnouncement?: boolean;
  };
}

export interface PostFilters {
  category?: string;
  tags?: string[];
  author?: string;
  status?: string;
  search?: string;
}

interface PostsState {
  // Posts state
  posts: Post[];
  currentPost: Post | null;
  isLoadingPosts: boolean;
  postsError: string | null;
  
  // Communities state
  communities: Community[];
  joinedCommunities: Community[];
  ownedCommunities: Community[];
  currentCommunity: Community | null;
  isLoadingCommunities: boolean;
  communitiesError: string | null;
  
  // Spaces state
  spaces: Space[];
  communitySpaces: Record<string, Space[]>;
  currentSpace: Space | null;
  spaceContents: Record<string, Post[]>; // Posts/messages for current space, keyed by spaceId
  isLoadingSpaces: boolean;
  isLoadingSpaceContent: boolean;
  spacesError: string | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  
  // Filters
  activeFilters: PostFilters;
  
  // Actions - Posts
  fetchPosts: (page?: number, filters?: PostFilters) => Promise<void>;
  fetchPost: (id: string) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (id: string, data: Partial<CreatePostData>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  likePost: (id: string) => Promise<void>;
  unlikePost: (id: string) => Promise<void>;
  
  // Actions - Communities
  fetchCommunities: (filters?: { category?: string; search?: string }) => Promise<void>;
  fetchJoinedCommunities: () => Promise<void>;
  fetchOwnedCommunities: () => Promise<void>;
  fetchCommunity: (id: string) => Promise<void>;
  getCommunityById: (id: string) => Community | undefined;
  createCommunity: (data: CreateCommunityData) => Promise<Community>;
  updateCommunity: (id: string, data: Partial<CreateCommunityData>) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
  joinCommunity: (id: string) => Promise<void>;
  leaveCommunity: (id: string) => Promise<void>;
  
  // Actions - Spaces
  fetchSpaces: (communityId?: string) => Promise<void>;
  fetchSpacesByCommunity: (communityId: string) => Promise<void>;
  fetchSpace: (id: string) => Promise<void>;
  fetchSpaceContent: (params: { spaceId: string; communityId: string; type?: 'posts' | 'messages' }) => Promise<void>;
  createSpacePost: (spaceId: string, data: CreateSpacePostData) => Promise<void>;
  createSpace: (data: CreateSpaceData) => Promise<Space>;
  updateSpace: (id: string, data: Partial<CreateSpaceData>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  joinSpace: (id: string) => Promise<void>;
  leaveSpace: (id: string) => Promise<void>;
  
  // Chat Actions
  openSpaceChat: (spaceId: string, spaceName: string) => Promise<string>; // Returns conversationId
  sendSpaceMessage: (spaceId: string, content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
  
  // Utility actions
  clearErrors: () => void;
  setCurrentCommunity: (community: Community | null) => void;
  setCurrentSpace: (space: Space | null) => void;
  setFilters: (filters: PostFilters) => void;
  clearFilters: () => void;
}

export const usePostsStore = create<PostsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      posts: [],
      currentPost: null,
      isLoadingPosts: false,
      postsError: null,
      
      communities: [],
      joinedCommunities: [],
      ownedCommunities: [],
      currentCommunity: null,
      isLoadingCommunities: false,
      communitiesError: null,
      
      spaces: [],
      communitySpaces: {},
      currentSpace: null,
      spaceContents: {},
      isLoadingSpaces: false,
      isLoadingSpaceContent: false,
      spacesError: null,
      
      currentPage: 1,
      totalPages: 1,
      totalPosts: 0,
      
      activeFilters: {},
      
      // Posts actions
      fetchPosts: async (page = 1, filters = {}) => {
        try {
          set({ isLoadingPosts: true, postsError: null });
          
          // Build query params properly
          const params: Record<string, string> = {
            page: page.toString(),
            limit: '10',
          };
          
          // Add filters as strings
          if (filters.category) params.category = filters.category;
          if (filters.author) params.author = filters.author;
          if (filters.status) params.status = filters.status;
          if (filters.search) params.search = filters.search;
          if (filters.tags?.length) params.tags = filters.tags.join(',');
          
          const queryParams = new URLSearchParams(params);
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<PaginatedResponse<Post>>(
            `/posts?${queryParams.toString()}`
          );
          
          if (response.success && response.data) {
            set({
              posts: page === 1 ? response.data : [...get().posts, ...response.data],
              currentPage: response.pagination.page,
              totalPages: response.pagination.totalPages,
              totalPosts: response.pagination.total,
              activeFilters: filters,
            });
          } else {
            throw new Error(response.message || 'Failed to fetch posts');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch posts';
          set({ postsError: message });
        } finally {
          set({ isLoadingPosts: false });
        }
      },
      
      fetchPost: async (id: string) => {
        try {
          set({ isLoadingPosts: true, postsError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<Post>>(`/posts/${id}`);
          
          if (response.success && response.data) {
            set({ currentPost: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch post');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch post';
          set({ postsError: message });
        } finally {
          set({ isLoadingPosts: false });
        }
      },
      
      createPost: async (data: CreatePostData) => {
        try {
          set({ isLoadingPosts: true, postsError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ApiResponse<Post>>('/posts', data);
          
          if (response.success && response.data) {
            set(state => ({
              posts: [response.data!, ...state.posts],
              totalPosts: state.totalPosts + 1,
            }));
          } else {
            throw new Error(response.message || 'Failed to create post');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create post';
          set({ postsError: message });
          throw error;
        } finally {
          set({ isLoadingPosts: false });
        }
      },
      
      updatePost: async (id: string, data: Partial<CreatePostData>) => {
        try {
          set({ isLoadingPosts: true, postsError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.patch<ApiResponse<Post>>(`/posts/${id}`, data);
          
          if (response.success && response.data) {
            set(state => ({
              posts: state.posts.map(post => 
                post.id === id ? response.data! : post
              ),
              currentPost: state.currentPost?.id === id ? response.data! : state.currentPost,
            }));
          } else {
            throw new Error(response.message || 'Failed to update post');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update post';
          set({ postsError: message });
          throw error;
        } finally {
          set({ isLoadingPosts: false });
        }
      },
      
      deletePost: async (id: string) => {
        try {
          set({ isLoadingPosts: true, postsError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.delete<ApiResponse>(`/posts/${id}`);
          
          if (response.success) {
            set(state => ({
              posts: state.posts.filter(post => post.id !== id),
              currentPost: state.currentPost?.id === id ? null : state.currentPost,
              totalPosts: Math.max(0, state.totalPosts - 1),
            }));
          } else {
            throw new Error(response.message || 'Failed to delete post');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete post';
          set({ postsError: message });
          throw error;
        } finally {
          set({ isLoadingPosts: false });
        }
      },
      
      likePost: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();

          // Use the correct reaction endpoint
          const response = await apiStore.post<ApiResponse>(`/posts/${id}/reactions`, {
            type: 'like'
          });

          if (response.success) {
            // Optimistic update - the backend handles like count increment
            set(state => ({
              posts: state.posts.map(post =>
                post.id === id
                  ? { ...post, isLiked: true, likeCount: post.likeCount + 1 }
                  : post
              ),
              currentPost: state.currentPost?.id === id
                ? { ...state.currentPost, isLiked: true, likeCount: state.currentPost.likeCount + 1 }
                : state.currentPost,
            }));

            console.log(`✅ [PostStore] Successfully liked post: ${id}`);
          }
        } catch (error) {
          console.error(`❌ [PostStore] Failed to like post:`, error);
          // Revert optimistic update on error
          set(state => ({
            posts: state.posts.map(post =>
              post.id === id
                ? { ...post, isLiked: false, likeCount: Math.max(0, post.likeCount - 1) }
                : post
            ),
            currentPost: state.currentPost?.id === id
              ? { ...state.currentPost, isLiked: false, likeCount: Math.max(0, state.currentPost.likeCount - 1) }
              : state.currentPost,
          }));
        }
      },
      
      unlikePost: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();
          const response = await apiStore.delete<ApiResponse>(`/posts/${id}/like`);
          
          if (response.success) {
            set(state => ({
              posts: state.posts.map(post => 
                post.id === id 
                  ? { ...post, isLiked: false, likeCount: Math.max(0, post.likeCount - 1) }
                  : post
              ),
              currentPost: state.currentPost?.id === id 
                ? { ...state.currentPost, isLiked: false, likeCount: Math.max(0, state.currentPost.likeCount - 1) }
                : state.currentPost,
            }));
          }
        } catch (error) {
        }
      },
      
      // Communities actions
      fetchCommunities: async (filters = {}) => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const params = new URLSearchParams();
          if (filters.category) params.append('category', filters.category);
          if (filters.search) params.append('search', filters.search);
          
          const queryString = params.toString();
          const url = queryString ? `/communities?${queryString}` : '/communities';
          const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number }>>(url);
          
          // Backend returns { success: true, data: { communities: Community[], total: number } }
          if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
            // Get current joined communities to set isJoined flag
            const currentState = get();
            const joinedCommunityIds = new Set(currentState.joinedCommunities.map(c => c.id));
            
            const communitiesWithJoinStatus = response.data.communities.map(community => ({
              ...community,
              isJoined: joinedCommunityIds.has(community.id)
            }));
            
            set({ communities: communitiesWithJoinStatus });
          } else {
            // Fallback if response structure is different
            set({ communities: [] });
           
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch communities';
          set({ communitiesError: message });
          set({ communities: [] }); // Ensure communities is always an array
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      fetchJoinedCommunities: async () => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number; page: number; limit: number }>>('/communities/me/joined');
          
          // Backend returns { success: true, data: { communities: Community[], total, page, limit } }
          if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
            const joinedCommunitiesWithStatus = response.data.communities.map(community => ({
              ...community,
              isJoined: true
            }));
            
            set(state => {
              // Update main communities list with joined status
              const joinedIds = new Set(joinedCommunitiesWithStatus.map(c => c.id));
              const updatedCommunities = state.communities.map(community => ({
                ...community,
                isJoined: joinedIds.has(community.id)
              }));
              
              return {
                joinedCommunities: joinedCommunitiesWithStatus,
                communities: updatedCommunities
              };
            });
          } else {
            // Fallback if response structure is different
            set({ joinedCommunities: [] });
          
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch joined communities';
          set({ communitiesError: message });
          set({ joinedCommunities: [] }); // Ensure joinedCommunities is always an array
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      fetchOwnedCommunities: async () => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<{ communities: Community[]; total: number; page: number; limit: number }>>('/communities/me/owned');
          
          // Backend returns { success: true, data: { communities: Community[], total, page, limit } }
          if (response.success && response.data?.communities && Array.isArray(response.data.communities)) {
            set({ ownedCommunities: response.data.communities });
          } else {
            // Fallback if response structure is different
            set({ ownedCommunities: [] });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch owned communities';
          set({ communitiesError: message });
          set({ ownedCommunities: [] }); // Ensure ownedCommunities is always an array
        } finally {
          set({ isLoadingCommunities: false });
        }
      },
      
      fetchCommunity: async (id: string) => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<Community>>(`/communities/${id}`);
          
          if (response.success && response.data) {
            set({ currentCommunity: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch community';
          set({ communitiesError: message });
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      getCommunityById: (id: string) => {
        const state = get();
        return state.communities.find(community => community.id === id) ||
               state.joinedCommunities.find(community => community.id === id) ||
               state.ownedCommunities.find(community => community.id === id);
      },

      createCommunity: async (data: CreateCommunityData) => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ApiResponse<Community>>('/communities', data);
          
          if (response.success && response.data) {
            set(state => ({
              communities: [response.data!, ...state.communities],
              ownedCommunities: [response.data!, ...state.ownedCommunities],
            }));
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to create community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create community';
          set({ communitiesError: message });
          throw error;
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      updateCommunity: async (id: string, data: Partial<CreateCommunityData>) => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.patch<ApiResponse<Community>>(`/communities/${id}`, data);
          
          if (response.success && response.data) {
            set(state => ({
              communities: state.communities.map(community => 
                community.id === id ? response.data! : community
              ),
              joinedCommunities: state.joinedCommunities.map(community => 
                community.id === id ? response.data! : community
              ),
              ownedCommunities: state.ownedCommunities.map(community => 
                community.id === id ? response.data! : community
              ),
              currentCommunity: state.currentCommunity?.id === id ? response.data! : state.currentCommunity,
            }));
          } else {
            throw new Error(response.message || 'Failed to update community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update community';
          set({ communitiesError: message });
          throw error;
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      deleteCommunity: async (id: string) => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.delete<ApiResponse>(`/communities/${id}`);
          
          if (response.success) {
            set(state => ({
              communities: state.communities.filter(community => community.id !== id),
              joinedCommunities: state.joinedCommunities.filter(community => community.id !== id),
              ownedCommunities: state.ownedCommunities.filter(community => community.id !== id),
              currentCommunity: state.currentCommunity?.id === id ? null : state.currentCommunity,
            }));
          } else {
            throw new Error(response.message || 'Failed to delete community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete community';
          set({ communitiesError: message });
          throw error;
        } finally {
          set({ isLoadingCommunities: false });
        }
      },
      
      joinCommunity: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ApiResponse>(`/communities/${id}/join`);
          
          if (response.success) {
            set(state => ({
              communities: state.communities.map(community => 
                community.id === id 
                  ? { ...community, isJoined: true, memberCount: community.memberCount + 1 }
                  : community
              ),
              currentCommunity: state.currentCommunity?.id === id 
                ? { ...state.currentCommunity, isJoined: true, memberCount: state.currentCommunity.memberCount + 1 }
                : state.currentCommunity,
            }));
            
            // Refetch joined communities
            get().fetchJoinedCommunities();
          } else {
            throw new Error(response.message || 'Failed to join community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join community';
          set({ communitiesError: message });
          throw error;
        }
      },
      
      leaveCommunity: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();
          const response = await apiStore.delete<ApiResponse>(`/communities/${id}/leave`);
          
          if (response.success) {
            set(state => ({
              communities: state.communities.map(community => 
                community.id === id 
                  ? { ...community, isJoined: false, memberCount: Math.max(0, community.memberCount - 1) }
                  : community
              ),
              joinedCommunities: state.joinedCommunities.filter(community => community.id !== id),
              currentCommunity: state.currentCommunity?.id === id 
                ? { ...state.currentCommunity, isJoined: false, memberCount: Math.max(0, state.currentCommunity.memberCount - 1) }
                : state.currentCommunity,
            }));
          } else {
            throw new Error(response.message || 'Failed to leave community');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to leave community';
          set({ communitiesError: message });
          throw error;
        }
      },

      // Spaces actions
      fetchSpaces: async (communityId?: string) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          const url = communityId ? `/communities/${communityId}/spaces` : '/spaces';
        
          
          const response = await apiStore.get<ApiResponse<{ spaces: Space[] }>>(url);
       
          console.log("refresh test =>>>>>>>>>>>> ",response?.data?.spaces)
          if (response.success && response.data) {
            if (communityId) {
              set(state => ({
                communitySpaces: {
                  ...state.communitySpaces,
                  [communityId]: response.data?.spaces!
                }
              }));
            } else {
              set({ spaces: response.data.spaces! });
            }
          } else {
           
            throw new Error(response.message || 'Failed to fetch spaces');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch spaces';
    
          set({ spacesError: message });
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      fetchSpacesByCommunity: async (communityId: string) => {
        return get().fetchSpaces(communityId);
      },

      fetchSpace: async (id: string) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          // First, try to find the space in our existing community spaces
          const { spaces, communitySpaces } = get();
          let existingSpace = spaces.find(space => space.id === id);
          
          // If not found in main spaces, check community spaces
          if (!existingSpace) {
            for (const communityId of Object.keys(communitySpaces)) {
              const communitySpaceList = communitySpaces[communityId];
              existingSpace = communitySpaceList?.find(space => space.id === id);
              if (existingSpace) break;
            }
          }

          // If we found the space locally and it has communityId, use the proper endpoint
          if (existingSpace?.communityId) {
            const apiStore = useApiStore.getState();
            const response = await apiStore.get<ApiResponse<Space>>(
              `/communities/${existingSpace.communityId}/spaces/${id}`
            );
            
            if (response.success && response.data) {
              const updatedSpace = response.data;
              
              // Update the space in all relevant places first
              set(state => ({
                // Update spaces array
                spaces: state.spaces.map(space => 
                  space.id === id ? { ...space, ...updatedSpace } : space
                ),
                // Update community spaces
                communitySpaces: Object.fromEntries(
                  Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                    communityId,
                    spaces.map(space => 
                      space.id === id ? { ...space, ...updatedSpace } : space
                    )
                  ])
                ),
                // Set currentSpace from updated local data to preserve isJoined status
                currentSpace: state.spaces.find(s => s.id === id) || 
                             Object.values(state.communitySpaces).flat().find(s => s.id === id) ||
                             updatedSpace
              }));
            } else {
              throw new Error(response.message || 'Failed to fetch space');
            }
          } else {
            // Fallback: if we don't have communityId, we need to find another way
            // This shouldn't happen in normal flow, but just in case
            throw new Error('Space not found in local data. Please navigate from community page.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch space';
          set({ spacesError: message });
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      fetchSpaceContent: async (params: { spaceId: string; communityId: string; type?: 'posts' | 'messages' }) => {
        if (!params || !params.spaceId || !params.communityId) {
          console.error('❌ [PostsStore] fetchSpaceContent called with invalid params:', params);
          // We don't want to throw an error here, just stop execution,
          // as another valid call might be on its way.
          return;
        }

        const { spaceId, communityId, type = 'posts' } = params;
        try {
          set({ isLoadingSpaceContent: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          
          const response = await apiStore.get<ApiResponse<any>>(
            `/communities/${communityId}/spaces/${spaceId}/content?limit=50&type=${type}`
          );
                   
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch space content');
          }

          const content = type === 'messages' ? response.data?.messages : response.data?.posts;

          if (content && Array.isArray(content)) {
            set(state => ({ 
              spaceContents: {
                ...state.spaceContents,
                [spaceId]: content
              } 
            }));
          } else {
            console.warn(`[PostsStore] No content found for space ${spaceId} of type ${type}. Response:`, response);
            set(state => ({ 
              spaceContents: {
                ...state.spaceContents,
                [spaceId]: []
              } 
            }));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch space content';
         
          set({ spacesError: message });
          // Set empty array on error to avoid showing dummy data
          set(state => ({ 
            spaceContents: {
              ...state.spaceContents,
              [spaceId]: []
            } 
          }));
        } finally {
          set({ isLoadingSpaceContent: false });
        }
      },

      createSpacePost: async (spaceId: string, data: CreateSpacePostData) => {
        try {
          // Set loading state for post creation
          set({ isLoadingSpaceContent: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          const { currentSpace } = get();
          
          if (!currentSpace?.communityId) {
            throw new Error('Community ID not found for space');
          }

      

          // Prepare the request payload
          const payload = {
            title: data.title,
            content: data.content,
            type: data.type || 'text',
            // Include all rich media data
            ...(data.images && { images: data.images }),
            ...(data.videos && { videos: data.videos }),
            ...(data.documents && { documents: data.documents }),
            ...(data.linkPreview && { linkPreview: data.linkPreview }),
            ...(data.poll && { poll: data.poll }),
            ...(data.event && { event: data.event }),
            ...(data.formatting && { formatting: data.formatting }),
            ...(data.settings && { settings: data.settings }),
          };

          const response = await apiStore.post(
            `/communities/${currentSpace.communityId}/spaces/${spaceId}/content`,
            payload
          );

          if (response.success) {
            // Refresh space content to show the new post
            await get().fetchSpaceContent({
              spaceId,
              communityId: currentSpace.communityId,
              type: 'posts'
            });
          } else {
            throw new Error(response.message || 'Failed to create post');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create post';
          set({ spacesError: message, isLoadingSpaceContent: false });
          throw new Error(message);
        }
      },

      createSpace: async (data: CreateSpaceData) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          // 🔧 FIX: Remove communityId from request body since it's in the URL path
          const { communityId, ...requestData } = data;
          const response = await apiStore.post<ApiResponse<Space>>(`/communities/${communityId}/spaces`, requestData);
          
          if (response.success && response.data) {
            const newSpace = response.data;
            set(state => ({
              spaces: [newSpace, ...state.spaces],
              communitySpaces: {
                ...state.communitySpaces,
                [communityId]: [
                  newSpace,
                  ...(state.communitySpaces[communityId] || [])
                ]
              }
            }));
            return newSpace;
          } else {
            throw new Error(response.message || 'Failed to create space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create space';
          set({ spacesError: message });
          throw error;
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      updateSpace: async (id: string, data: Partial<CreateSpaceData>) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.patch<ApiResponse<Space>>(`/spaces/${id}`, data);
          
          if (response.success && response.data) {
            const updatedSpace = response.data;
            set(state => ({
              spaces: state.spaces.map(space => 
                space.id === id ? updatedSpace : space
              ),
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.map(space => space.id === id ? updatedSpace : space)
                ])
              ),
              currentSpace: state.currentSpace?.id === id ? updatedSpace : state.currentSpace,
            }));
          } else {
            throw new Error(response.message || 'Failed to update space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update space';
          set({ spacesError: message });
          throw error;
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      deleteSpace: async (id: string) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.delete<ApiResponse>(`/spaces/${id}`);
          
          if (response.success) {
            set(state => ({
              spaces: state.spaces.filter(space => space.id !== id),
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.filter(space => space.id !== id)
                ])
              ),
              currentSpace: state.currentSpace?.id === id ? null : state.currentSpace,
            }));
          } else {
            throw new Error(response.message || 'Failed to delete space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete space';
          set({ spacesError: message });
          throw error;
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      joinSpace: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();
          const { currentSpace } = get();
          
          if (!currentSpace?.communityId) {
            throw new Error('Community ID not found for space');
          }
          
          const response = await apiStore.post<ApiResponse>(`/communities/${currentSpace.communityId}/spaces/${id}/join`, {});
          
          if (response.success) {
            // Update space in all relevant places
            set(state => ({
              // Update spaces array
              spaces: state.spaces.map(space => 
                space.id === id 
                  ? { ...space, memberCount: (space.memberCount || 0) + 1, isJoined: true }
                  : space
              ),
              // Update community spaces
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.map(space => 
                    space.id === id 
                      ? { ...space, memberCount: (space.memberCount || 0) + 1, isJoined: true }
                      : space
                  )
                ])
              ),
              // Update current space if it's the one being joined
              currentSpace: state.currentSpace?.id === id 
                ? { ...state.currentSpace, memberCount: (state.currentSpace.memberCount || 0) + 1, isJoined: true }
                : state.currentSpace
            }));
          } else {
            throw new Error(response.message || 'Failed to join space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join space';
          set({ spacesError: message });
          throw error;
        }
      },

      leaveSpace: async (id: string) => {
        try {
          const apiStore = useApiStore.getState();
          const { currentSpace } = get();
          const { useAuthStore } = await import('./auth');
          const { user } = useAuthStore.getState();
          
          if (!currentSpace?.communityId) {
            throw new Error('Community ID not found for space');
          }
          
          if (!user?.id) {
            throw new Error('User not authenticated');
          }
          
          // Use the member removal endpoint for self-leave
          const response = await apiStore.delete<ApiResponse>(`/communities/${currentSpace.communityId}/spaces/${id}/members/${user.id}`);
          
          if (response.success) {
            // Update space in all relevant places
            set(state => ({
              // Update spaces array
              spaces: state.spaces.map(space => 
                space.id === id 
                  ? { ...space, memberCount: Math.max(0, (space.memberCount || 0) - 1), isJoined: false }
                  : space
              ),
              // Update community spaces
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.map(space => 
                    space.id === id 
                      ? { ...space, memberCount: Math.max(0, (space.memberCount || 0) - 1), isJoined: false }
                      : space
                  )
                ])
              ),
              // Update current space if it's the one being left
              currentSpace: state.currentSpace?.id === id 
                ? { ...state.currentSpace, memberCount: Math.max(0, (state.currentSpace.memberCount || 0) - 1), isJoined: false }
                : state.currentSpace
            }));
          } else {
            throw new Error(response.message || 'Failed to leave space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to leave space';
          set({ spacesError: message });
          throw error;
        }
      },

      // Chat Actions for Space Integration
      openSpaceChat: async (spaceId: string, spaceName: string) => {
        try {
          const apiStore = useApiStore.getState();
          const { currentSpace } = get();
          
          if (!currentSpace?.communityId) {
            throw new Error('Community ID not found for space');
          }

          // Create or get space conversation
          const response = await apiStore.post<ApiResponse<{ conversationId: string }>>(
            `/communities/${currentSpace.communityId}/spaces/${spaceId}/chat/conversation`,
            { spaceName }
          );

          if (response.success && response.data?.conversationId) {
   
            return response.data.conversationId;
          } else {
            throw new Error(response.message || 'Failed to open space chat');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to open space chat';
       
          throw new Error(message);
        }
      },

      sendSpaceMessage: async (spaceId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
        try {
          const apiStore = useApiStore.getState();
          const { currentSpace } = get();
          
          if (!currentSpace?.communityId) {
            throw new Error('Community ID not found for space');
          }

          const response = await apiStore.post(
            `/communities/${currentSpace.communityId}/spaces/${spaceId}/chat/message`,
            {
              content,
              type
            }
          );

          if (!response.success) {
            throw new Error(response.message || 'Failed to send message');
          }

        
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send message';
          throw new Error(message);
        }
      },

      // Utility actions
      setFilters: (filters: PostFilters) => {
        set({ activeFilters: filters });
      },
      
      clearFilters: () => {
        set({ activeFilters: {} });
      },
      
      clearErrors: () => {
        set({ postsError: null, communitiesError: null, spacesError: null });
      },
      
      setCurrentCommunity: (community: Community | null) => {
        set({ currentCommunity: community });
      },
      
      setCurrentSpace: (space: Space | null) => {
        set({ currentSpace: space });
      },
    }),
    {
      name: 'posts-store',
    }
  )
);

// Custom hooks for easier usage
export const usePosts = () => {
  const postsStore = usePostsStore();
  return {
    posts: postsStore.posts,
    currentPost: postsStore.currentPost,
    isLoading: postsStore.isLoadingPosts,
    error: postsStore.postsError,
    currentPage: postsStore.currentPage,
    totalPages: postsStore.totalPages,
    totalPosts: postsStore.totalPosts,
    activeFilters: postsStore.activeFilters,
    fetchPosts: postsStore.fetchPosts,
    fetchPost: postsStore.fetchPost,
    createPost: postsStore.createPost,
    updatePost: postsStore.updatePost,
    deletePost: postsStore.deletePost,
    likePost: postsStore.likePost,
    unlikePost: postsStore.unlikePost,
    setFilters: postsStore.setFilters,
    clearFilters: postsStore.clearFilters,
    clearErrors: postsStore.clearErrors,
  };
};

export const useCommunities = () => {
  const postsStore = usePostsStore();
  return {
    // State
    communities: postsStore.communities,
    joinedCommunities: postsStore.joinedCommunities,
    ownedCommunities: postsStore.ownedCommunities,
    currentCommunity: postsStore.currentCommunity,
    isLoading: postsStore.isLoadingCommunities,
    error: postsStore.communitiesError,
    
    // Actions
    fetchCommunities: postsStore.fetchCommunities,
    fetchJoinedCommunities: postsStore.fetchJoinedCommunities,
    fetchOwnedCommunities: postsStore.fetchOwnedCommunities,
    fetchCommunity: postsStore.fetchCommunity,
    getCommunityById: postsStore.getCommunityById,
    createCommunity: postsStore.createCommunity,
    updateCommunity: postsStore.updateCommunity,
    deleteCommunity: postsStore.deleteCommunity,
    joinCommunity: postsStore.joinCommunity,
    leaveCommunity: postsStore.leaveCommunity,
    setCurrentCommunity: postsStore.setCurrentCommunity,
    clearErrors: postsStore.clearErrors,
  };
};

export const useSpaces = () => {
  const postsStore = usePostsStore();
  return {
    // State
    spaces: postsStore.spaces,
    communitySpaces: postsStore.communitySpaces,
    currentSpace: postsStore.currentSpace,
    spaceContents: postsStore.spaceContents,
    isLoading: postsStore.isLoadingSpaces,
    isLoadingContent: postsStore.isLoadingSpaceContent,
    error: postsStore.spacesError,
    
    // Actions
    fetchSpaces: postsStore.fetchSpaces,
    fetchSpacesByCommunity: postsStore.fetchSpacesByCommunity,
    fetchSpace: postsStore.fetchSpace,
    fetchSpaceContent: postsStore.fetchSpaceContent,
    createSpace: postsStore.createSpace,
    createSpacePost: postsStore.createSpacePost,
    updateSpace: postsStore.updateSpace,
    deleteSpace: postsStore.deleteSpace,
    joinSpace: postsStore.joinSpace,
    leaveSpace: postsStore.leaveSpace,
    setCurrentSpace: postsStore.setCurrentSpace,
    clearErrors: postsStore.clearErrors,
  };
};
