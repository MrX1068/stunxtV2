import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { contentApi } from '../services/contentApi';

// Content types for space content
export interface SpaceContent {
  id: string;
  title?: string;
  content: string;
  type: 'post' | 'message' | 'thread';
  authorId: string;
  author: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
  spaceId: string;
  space?: {
    id: string;
    name: string;
    interactionType: string;
  };
  communityId: string;
  community?: {
    id: string;
    name: string;
  };
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'members_only' | 'private';
  metadata?: {
    tags?: string[];
    mentions?: string[];
    hashtags?: string[];
    editHistory?: Array<{
      content: string;
      timestamp: string;
    }>;
    qualityScore?: number;
    readingTime?: number;
  };
  reactions?: {
    likes: number;
    dislikes: number;
    hearts: number;
    userReaction?: string;
  };
  userReaction?: string; // Direct field from backend
  comments?: {
    count: number;
    recent?: Array<{
      id: string;
      content: string;
      author: {
        id: string;
        fullName: string;
        username: string;
        avatarUrl: string | null;
      };
      createdAt: string;
    }>;
  };
  media?: Array<{
    id: string;
    type: 'image' | 'video' | 'document';
    url: string;
    thumbnail?: string;
    metadata?: any;
  }>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateContentData {
  title?: string;
  content: string;
  type?: 'post' | 'message' | 'thread';
  tags?: string[];
  visibility?: 'public' | 'members_only' | 'private';
  metadata?: Record<string, any>;
  scheduledFor?: string;
}

export interface ContentFilters {
  type?: 'post' | 'message' | 'thread';
  author?: string;
  tags?: string[];
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'members_only' | 'private';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ContentState {
  // Content state
  contents: Record<string, SpaceContent[]>; // Keyed by spaceId
  currentContent: SpaceContent | null;
  isLoadingContent: boolean;
  isCreatingContent: boolean;
  contentError: string | null;
  
  // Pagination state
  pagination: Record<string, {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  }>; // Keyed by spaceId
  
  // Filters
  activeFilters: Record<string, ContentFilters>; // Keyed by spaceId
  
  // Actions
  fetchSpaceContent: (params: {
    communityId: string;
    spaceId: string;
    type?: 'posts' | 'messages';
    limit?: number;
    offset?: number;
    filters?: ContentFilters;
  }) => Promise<void>;
  
  createSpaceContent: (params: {
    communityId: string;
    spaceId: string;
    data: CreateContentData;
  }) => Promise<SpaceContent>;
  
  updateContent: (contentId: string, data: Partial<CreateContentData>) => Promise<void>;
  deleteContent: (contentId: string) => Promise<void>;
  
  // Reactions
  addReaction: (contentId: string, reactionType: string) => Promise<void>;
  removeReaction: (contentId: string, reactionType: string) => Promise<void>;
  
  // Comments
  addComment: (contentId: string, content: string, parentId?: string) => Promise<void>;
  
  // Utility actions
  setCurrentContent: (content: SpaceContent | null) => void;
  setFilters: (spaceId: string, filters: ContentFilters) => void;
  clearFilters: (spaceId: string) => void;
  clearErrors: () => void;
  clearSpaceContent: (spaceId: string) => void;
}

// Transform backend post data to frontend SpaceContent format
const transformBackendPost = (backendPost: any): SpaceContent => {
  const transformed = {
    ...backendPost,
    // Transform reaction data from backend format to frontend format
    reactions: {
      likes: backendPost.likeCount || 0,
      dislikes: 0, // Backend doesn't track dislike count separately
      hearts: 0,   // Backend doesn't track love count separately (only likeCount for all reactions)
      userReaction: backendPost.userReaction,
    },
    // Keep direct userReaction field for backward compatibility
    userReaction: backendPost.userReaction,
  };

  // Debug logging to verify transformation
  if (backendPost.likeCount > 0 || backendPost.userReaction) {
    console.log(`🔧 [ContentStore] Transformed post ${backendPost.id}: likeCount=${backendPost.likeCount} -> reactions.likes=${transformed.reactions.likes}, userReaction=${backendPost.userReaction}`);
  }

  return transformed;
};

export const useContentStore = create<ContentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      contents: {},
      currentContent: null,
      isLoadingContent: false,
      isCreatingContent: false,
      contentError: null,
      pagination: {},
      activeFilters: {},
      
      // Fetch space content
      fetchSpaceContent: async (params) => {
        const { communityId, spaceId, type = 'posts' as const, limit = 50, offset = 0, filters = {} } = params;
        
        try {
          set({ isLoadingContent: true, contentError: null });
          
          // Separate type from filters to avoid conflicts
          const { type: filterType, ...otherFilters } = filters;

          const response = await contentApi.getSpaceContent({
            communityId,
            spaceId,
            type, // Use the parameter type, not the filter type
            limit,
            offset,
            ...otherFilters, // Spread other filters without type
          });
          
          const currentContents = get().contents[spaceId] || [];
          // Transform backend response to frontend format
          const transformedData = response.data.map(transformBackendPost);
          const newContents = offset === 0 ? transformedData : [...currentContents, ...transformedData];
          
          set((state) => ({
            contents: {
              ...state.contents,
              [spaceId]: newContents,
            },
            pagination: {
              ...state.pagination,
              [spaceId]: {
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(response.total / limit),
                totalItems: response.total,
                hasMore: response.hasMore || (offset + limit < response.total),
              },
            },
            isLoadingContent: false,
          }));
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to fetch space content:', error);
          set({
            contentError: error.message || 'Failed to fetch content',
            isLoadingContent: false,
          });
        }
      },
      
      // Create space content
      createSpaceContent: async (params) => {
        const { communityId, spaceId, data } = params;
        
        try {
          set({ isCreatingContent: true, contentError: null });
          
          const newContent = await contentApi.createSpaceContent({
            communityId,
            spaceId,
            data,
          });

          // Transform the new content and add to the beginning of the content list
          const transformedContent = transformBackendPost(newContent);
          set((state) => ({
            contents: {
              ...state.contents,
              [spaceId]: [transformedContent, ...(state.contents[spaceId] || [])],
            },
            isCreatingContent: false,
          }));
          
          return newContent;
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to create content:', error);
          set({
            contentError: error.message || 'Failed to create content',
            isCreatingContent: false,
          });
          throw error;
        }
      },
      
      // Update content
      updateContent: async (contentId, data) => {
        try {
          await contentApi.updateContent(contentId, data);
          
          // Update in all space content lists
          set((state) => {
            const updatedContents = { ...state.contents };
            Object.keys(updatedContents).forEach(spaceId => {
              updatedContents[spaceId] = updatedContents[spaceId].map(content =>
                content.id === contentId ? { ...content, ...data, updatedAt: new Date().toISOString() } : content
              );
            });
            return { contents: updatedContents };
          });
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to update content:', error);
          set({ contentError: error.message || 'Failed to update content' });
          throw error;
        }
      },
      
      // Delete content
      deleteContent: async (contentId) => {
        try {
          await contentApi.deleteContent(contentId);
          
          // Remove from all space content lists
          set((state) => {
            const updatedContents = { ...state.contents };
            Object.keys(updatedContents).forEach(spaceId => {
              updatedContents[spaceId] = updatedContents[spaceId].filter(content => content.id !== contentId);
            });
            return { contents: updatedContents };
          });
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to delete content:', error);
          set({ contentError: error.message || 'Failed to delete content' });
          throw error;
        }
      },
      
      // Add reaction
      addReaction: async (contentId, reactionType) => {
        try {
          console.log(`🔄 [ContentStore] Adding reaction ${reactionType} to content ${contentId}`);

          await contentApi.addReaction(contentId, reactionType);

          // Update reaction in content lists optimistically
          set((state) => {
            const updatedContents = { ...state.contents };
            Object.keys(updatedContents).forEach(spaceId => {
              updatedContents[spaceId] = updatedContents[spaceId].map(content => {
                if (content.id === contentId) {
                  const currentReactions = content.reactions || { likes: 0, dislikes: 0, hearts: 0 };

                  // Map reaction types to legacy format for now
                  const reactionKey = reactionType === 'like' ? 'likes' :
                                    reactionType === 'love' ? 'hearts' :
                                    'likes'; // Default fallback

                  // If user already has this reaction, it will be removed (toggle)
                  // If user has different reaction, it will be updated
                  const isCurrentReaction = currentReactions.userReaction === reactionType;

                  if (isCurrentReaction) {
                    // Remove reaction (toggle off)
                    const currentCount = Number(currentReactions[reactionKey as keyof typeof currentReactions] || 0);
                    return {
                      ...content,
                      reactions: {
                        ...currentReactions,
                        [reactionKey]: Math.max(0, currentCount - 1),
                        userReaction: undefined,
                      },
                    };
                  } else {
                    // Add new reaction or change reaction
                    const currentCount = Number(currentReactions[reactionKey as keyof typeof currentReactions] || 0);
                    return {
                      ...content,
                      reactions: {
                        ...currentReactions,
                        [reactionKey]: currentCount + 1,
                        userReaction: reactionType,
                      },
                    };
                  }
                }
                return content;
              });
            });
            return { contents: updatedContents };
          });

          console.log(`✅ [ContentStore] Updated reaction ${reactionType} for content ${contentId}`);

        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to add reaction:', error);
          set({ contentError: error.message || 'Failed to add reaction' });
        }
      },
      
      // Remove reaction
      removeReaction: async (contentId, reactionType) => {
        try {
          console.log(`🔄 [ContentStore] Removing reaction ${reactionType} from content ${contentId}`);

          await contentApi.removeReaction(contentId, reactionType);

          // Update reaction in content lists
          set((state) => {
            const updatedContents = { ...state.contents };
            Object.keys(updatedContents).forEach(spaceId => {
              updatedContents[spaceId] = updatedContents[spaceId].map(content => {
                if (content.id === contentId) {
                  const reactions = content.reactions || { likes: 0, dislikes: 0, hearts: 0 };

                  // Map reaction types to legacy format
                  const reactionKey = reactionType === 'like' ? 'likes' :
                                    reactionType === 'love' ? 'hearts' :
                                    'likes'; // Default fallback

                  const currentCount = Number(reactions[reactionKey as keyof typeof reactions] || 0);

                  return {
                    ...content,
                    reactions: {
                      ...reactions,
                      [reactionKey]: Math.max(0, currentCount - 1),
                      userReaction: undefined,
                    },
                  };
                }
                return content;
              });
            });
            return { contents: updatedContents };
          });

          console.log(`✅ [ContentStore] Removed reaction ${reactionType} from content ${contentId}`);
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to remove reaction:', error);
          set({ contentError: error.message || 'Failed to remove reaction' });
        }
      },
      
      // Add comment
      addComment: async (contentId, content, parentId) => {
        try {
          const comment = await contentApi.addComment(contentId, content, parentId);
          
          // Update comment count in content lists
          set((state) => {
            const updatedContents = { ...state.contents };
            Object.keys(updatedContents).forEach(spaceId => {
              updatedContents[spaceId] = updatedContents[spaceId].map(item => {
                if (item.id === contentId) {
                  const comments = item.comments || { count: 0, recent: [] };
                  return {
                    ...item,
                    comments: {
                      count: comments.count + 1,
                      recent: [comment, ...(comments.recent || [])].slice(0, 3), // Keep only 3 recent
                    },
                  };
                }
                return item;
              });
            });
            return { contents: updatedContents };
          });
          
        } catch (error: any) {
          console.error('❌ [ContentStore] Failed to add comment:', error);
          set({ contentError: error.message || 'Failed to add comment' });
        }
      },
      
      // Utility actions
      setCurrentContent: (content) => set({ currentContent: content }),
      
      setFilters: (spaceId, filters) => set((state) => ({
        activeFilters: {
          ...state.activeFilters,
          [spaceId]: filters,
        },
      })),
      
      clearFilters: (spaceId) => set((state) => ({
        activeFilters: {
          ...state.activeFilters,
          [spaceId]: {},
        },
      })),
      
      clearErrors: () => set({ contentError: null }),
      
      clearSpaceContent: (spaceId) => set((state) => {
        const updatedContents = { ...state.contents };
        delete updatedContents[spaceId];
        
        const updatedPagination = { ...state.pagination };
        delete updatedPagination[spaceId];
        
        const updatedFilters = { ...state.activeFilters };
        delete updatedFilters[spaceId];
        
        return {
          contents: updatedContents,
          pagination: updatedPagination,
          activeFilters: updatedFilters,
        };
      }),
    }),
    {
      name: 'content-store',
    }
  )
);

// Custom hooks for easier usage
export const useSpaceContent = (spaceId: string) => {
  const contentStore = useContentStore();
  return {
    contents: contentStore.contents[spaceId] || [],
    currentContent: contentStore.currentContent,
    isLoading: contentStore.isLoadingContent,
    isCreating: contentStore.isCreatingContent,
    error: contentStore.contentError,
    pagination: contentStore.pagination[spaceId] || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
    },
    filters: contentStore.activeFilters[spaceId] || {},
    
    // Actions
    fetchContent: contentStore.fetchSpaceContent,
    createContent: contentStore.createSpaceContent,
    updateContent: contentStore.updateContent,
    deleteContent: contentStore.deleteContent,
    addReaction: contentStore.addReaction,
    removeReaction: contentStore.removeReaction,
    addComment: contentStore.addComment,
    setCurrentContent: contentStore.setCurrentContent,
    setFilters: (filters: ContentFilters) => contentStore.setFilters(spaceId, filters),
    clearFilters: () => contentStore.clearFilters(spaceId),
    clearErrors: contentStore.clearErrors,
    clearContent: () => contentStore.clearSpaceContent(spaceId),
  };
};
