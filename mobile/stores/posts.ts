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
    firstName: string;
    lastName: string;
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
  avatar?: string;
  banner?: string;
  memberCount: number;
  postCount: number;
  spaceCount: number;
  isJoined: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  category: string;
  tags: string[];
  rules?: string[];
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    allowFileUploads: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  communityId: string;
  communityName: string;
  type: 'text' | 'voice' | 'video' | 'announcement';
  lastMessage?: {
    id: string;
    content: string;
    authorName: string;
    timestamp: string;
  };
  unreadCount: number;
  isPrivate: boolean;
  participants?: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityData {
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  avatar?: string;
  banner?: string;
  rules?: string[];
}

export interface CreateSpaceData {
  name: string;
  description?: string;
  communityId: string;
  type: 'text' | 'voice' | 'video' | 'announcement';
  isPrivate: boolean;
}

export interface CreatePostData {
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  status: 'draft' | 'published';
  featuredImage?: string;
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
  isLoadingSpaces: boolean;
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
  createSpace: (data: CreateSpaceData) => Promise<Space>;
  updateSpace: (id: string, data: Partial<CreateSpaceData>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  joinSpace: (id: string) => Promise<void>;
  leaveSpace: (id: string) => Promise<void>;
  
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
      isLoadingSpaces: false,
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
          const response = await apiStore.post<ApiResponse>(`/posts/${id}/like`);
          
          if (response.success) {
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
          }
        } catch (error) {
          console.warn('Failed to like post:', error);
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
          console.warn('Failed to unlike post:', error);
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
          const response = await apiStore.get<ApiResponse<Community[]>>(url);
          
          if (response.success && response.data) {
            set({ communities: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch communities');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch communities';
          set({ communitiesError: message });
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      fetchJoinedCommunities: async () => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<Community[]>>('/communities/joined');
          
          if (response.success && response.data) {
            set({ joinedCommunities: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch joined communities');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch joined communities';
          set({ communitiesError: message });
        } finally {
          set({ isLoadingCommunities: false });
        }
      },

      fetchOwnedCommunities: async () => {
        try {
          set({ isLoadingCommunities: true, communitiesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<Community[]>>('/communities/owned');
          
          if (response.success && response.data) {
            set({ ownedCommunities: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch owned communities');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch owned communities';
          set({ communitiesError: message });
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
          const response = await apiStore.delete<ApiResponse>(`/communities/${id}/join`);
          
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
          const response = await apiStore.get<ApiResponse<Space[]>>(url);
          
          if (response.success && response.data) {
            if (communityId) {
              set(state => ({
                communitySpaces: {
                  ...state.communitySpaces,
                  [communityId]: response.data!
                }
              }));
            } else {
              set({ spaces: response.data });
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
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<ApiResponse<Space>>(`/spaces/${id}`);
          
          if (response.success && response.data) {
            set({ currentSpace: response.data });
          } else {
            throw new Error(response.message || 'Failed to fetch space');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch space';
          set({ spacesError: message });
        } finally {
          set({ isLoadingSpaces: false });
        }
      },

      createSpace: async (data: CreateSpaceData) => {
        try {
          set({ isLoadingSpaces: true, spacesError: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ApiResponse<Space>>('/spaces', data);
          
          if (response.success && response.data) {
            const newSpace = response.data;
            set(state => ({
              spaces: [newSpace, ...state.spaces],
              communitySpaces: {
                ...state.communitySpaces,
                [data.communityId]: [
                  newSpace,
                  ...(state.communitySpaces[data.communityId] || [])
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
          const response = await apiStore.post<ApiResponse>(`/spaces/${id}/join`);
          
          if (response.success) {
            // Update space in all relevant places
            set(state => ({
              spaces: state.spaces.map(space => 
                space.id === id 
                  ? { ...space, participants: (space.participants || 0) + 1 }
                  : space
              ),
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.map(space => 
                    space.id === id 
                      ? { ...space, participants: (space.participants || 0) + 1 }
                      : space
                  )
                ])
              ),
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
          const response = await apiStore.delete<ApiResponse>(`/spaces/${id}/join`);
          
          if (response.success) {
            // Update space in all relevant places
            set(state => ({
              spaces: state.spaces.map(space => 
                space.id === id 
                  ? { ...space, participants: Math.max(0, (space.participants || 0) - 1) }
                  : space
              ),
              communitySpaces: Object.fromEntries(
                Object.entries(state.communitySpaces).map(([communityId, spaces]) => [
                  communityId,
                  spaces.map(space => 
                    space.id === id 
                      ? { ...space, participants: Math.max(0, (space.participants || 0) - 1) }
                      : space
                  )
                ])
              ),
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
    isLoading: postsStore.isLoadingSpaces,
    error: postsStore.spacesError,
    
    // Actions
    fetchSpaces: postsStore.fetchSpaces,
    fetchSpacesByCommunity: postsStore.fetchSpacesByCommunity,
    fetchSpace: postsStore.fetchSpace,
    createSpace: postsStore.createSpace,
    updateSpace: postsStore.updateSpace,
    deleteSpace: postsStore.deleteSpace,
    joinSpace: postsStore.joinSpace,
    leaveSpace: postsStore.leaveSpace,
    setCurrentSpace: postsStore.setCurrentSpace,
    clearErrors: postsStore.clearErrors,
  };
};
