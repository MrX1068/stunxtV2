import { useApiStore } from '../stores/api';
import type { SpaceContent, CreateContentData, ContentFilters } from '../stores/contentStore';

export interface GetSpaceContentParams {
  communityId: string;
  spaceId: string;
  type?: 'posts' | 'messages';
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string[];
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'members_only' | 'private';
  sortBy?: 'createdAt' | 'updatedAt' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSpaceContentParams {
  communityId: string;
  spaceId: string;
  data: CreateContentData;
}

export interface SpaceContentResponse {
  data: SpaceContent[];
  total: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface CommentData {
  id: string;
  content: string;
  author: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  replies?: CommentData[];
}

class ContentApiService {
  private getApiStore() {
    return useApiStore.getState();
  }

  /**
   * Get space content (posts or messages based on space type)
   * Uses the specific endpoint: /communities/${communityId}/spaces/${spaceId}/content
   */
  async getSpaceContent(params: GetSpaceContentParams): Promise<SpaceContentResponse> {
    const {
      communityId,
      spaceId,
      type = 'posts',
      limit = 50,
      offset = 0,
      search,
      tags,
      author,
      status,
      visibility,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        type,
        sortBy,
        sortOrder,
      });

      // Add optional filters
      if (search) queryParams.append('search', search);
      if (author) queryParams.append('author', author);
      if (status) queryParams.append('status', status);
      if (visibility) queryParams.append('visibility', visibility);
      if (tags && tags.length > 0) queryParams.append('tags', tags.join(','));

      const endpoint = `/communities/${communityId}/spaces/${spaceId}/content?${queryParams.toString()}`;
      
      console.log(`📥 [ContentApi] Fetching space content: ${endpoint}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.get<{
        success: boolean;
        data: {
          posts: SpaceContent[];
          total: number;
          hasMore: boolean;
          currentPage: number;
          totalPages: number;
        };
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch space content');
      }
// console.log(response.data, "response.data")
      console.log(`✅ [ContentApi] Fetched ${response.data.posts.length} items for space ${spaceId}`);

      return {
        data: response.data.posts,
        total: response.data.total,
        hasMore: response.data.hasMore,
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
      };

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to fetch space content:', error);
      throw new Error(error.message || 'Failed to fetch space content');
    }
  }

  /**
   * Create content in space (post or message based on space type)
   */
  async createSpaceContent(params: CreateSpaceContentParams): Promise<SpaceContent> {
    const { communityId, spaceId, data } = params;

    try {
      const endpoint = `/communities/${communityId}/spaces/${spaceId}/content`;
      
      console.log(`📤 [ContentApi] Creating content in space ${spaceId}:`, data);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        data: SpaceContent;
        message: string;
      }>(endpoint, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to create content');
      }

      console.log(`✅ [ContentApi] Created content ${response.data.id} in space ${spaceId}`);

      return response.data;

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to create content:', error);
      throw new Error(error.message || 'Failed to create content');
    }
  }

  /**
   * Update existing content
   */
  async updateContent(contentId: string, data: Partial<CreateContentData>): Promise<SpaceContent> {
    try {
      const endpoint = `/posts/${contentId}`;
      
      console.log(`📝 [ContentApi] Updating content ${contentId}:`, data);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.put<{
        success: boolean;
        data: SpaceContent;
        message: string;
      }>(endpoint, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update content');
      }

      console.log(`✅ [ContentApi] Updated content ${contentId}`);

      return response.data;

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to update content:', error);
      throw new Error(error.message || 'Failed to update content');
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string): Promise<void> {
    try {
      const endpoint = `/posts/${contentId}`;
      
      console.log(`🗑️ [ContentApi] Deleting content ${contentId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete content');
      }

      console.log(`✅ [ContentApi] Deleted content ${contentId}`);

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to delete content:', error);
      throw new Error(error.message || 'Failed to delete content');
    }
  }

  /**
   * Add reaction to content
   */
  async addReaction(contentId: string, emoji: string): Promise<void> {
    try {
      const endpoint = `/posts/${contentId}/reactions`;

      // Map frontend emoji names to backend ReactionType enum values
      const emojiToTypeMap: Record<string, string> = {
        'likes': 'like',
        'loves': 'love',
        'laughs': 'laugh',
        'wows': 'wow',
        'sads': 'sad',
        'angrys': 'angry',
        'cares': 'care',
        'celebrates': 'celebrate',
        'supports': 'support',
        'insightfuls': 'insightful',
        'funnys': 'funny',
        'confuseds': 'confused',
        // Also support direct enum values
        'like': 'like',
        'love': 'love',
        'laugh': 'laugh',
        'wow': 'wow',
        'sad': 'sad',
        'angry': 'angry',
        'care': 'care',
        'celebrate': 'celebrate',
        'support': 'support',
        'insightful': 'insightful',
        'funny': 'funny',
        'confused': 'confused'
      };

      const reactionType = emojiToTypeMap[emoji] || 'like'; // Default to 'like'

      console.log(`👍 [ContentApi] Adding reaction ${emoji} (${reactionType}) to content ${contentId}`);

      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        message: string;
      }>(endpoint, { type: reactionType }); // Use 'type' instead of 'emoji'

      if (!response.success) {
        throw new Error(response.message || 'Failed to add reaction');
      }

      console.log(`✅ [ContentApi] Added reaction ${reactionType} to content ${contentId}`);

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to add reaction:', error);
      throw new Error(error.message || 'Failed to add reaction');
    }
  }

  /**
   * Remove reaction from content
   */
  async removeReaction(contentId: string, emoji: string): Promise<void> {
    try {
      // Map frontend emoji names to backend ReactionType enum values
      const emojiToTypeMap: Record<string, string> = {
        'likes': 'like',
        'loves': 'love',
        'laughs': 'laugh',
        'wows': 'wow',
        'sads': 'sad',
        'angrys': 'angry',
        'cares': 'care',
        'celebrates': 'celebrate',
        'supports': 'support',
        'insightfuls': 'insightful',
        'funnys': 'funny',
        'confuseds': 'confused',
        // Also support direct enum values
        'like': 'like',
        'love': 'love',
        'laugh': 'laugh',
        'wow': 'wow',
        'sad': 'sad',
        'angry': 'angry',
        'care': 'care',
        'celebrate': 'celebrate',
        'support': 'support',
        'insightful': 'insightful',
        'funny': 'funny',
        'confused': 'confused'
      };

      const reactionType = emojiToTypeMap[emoji] || 'like';
      const endpoint = `/posts/${contentId}/reactions/${reactionType}`;

      console.log(`👎 [ContentApi] Removing reaction ${emoji} (${reactionType}) from content ${contentId}`);

      const apiStore = this.getApiStore();
      const response = await apiStore.delete<{
        success: boolean;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to remove reaction');
      }

      console.log(`✅ [ContentApi] Removed reaction ${reactionType} from content ${contentId}`);

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to remove reaction:', error);
      throw new Error(error.message || 'Failed to remove reaction');
    }
  }

  /**
   * Add comment to content
   */
  async addComment(contentId: string, content: string, parentId?: string): Promise<CommentData> {
    try {
      const endpoint = `/posts/${contentId}/comments`;
      
      console.log(`💬 [ContentApi] Adding comment to content ${contentId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.post<{
        success: boolean;
        data: CommentData;
        message: string;
      }>(endpoint, { content, parentId });

      if (!response.success) {
        throw new Error(response.message || 'Failed to add comment');
      }

      console.log(`✅ [ContentApi] Added comment to content ${contentId}`);

      return response.data;

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to add comment:', error);
      throw new Error(error.message || 'Failed to add comment');
    }
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<SpaceContent> {
    try {
      const endpoint = `/posts/${contentId}`;
      
      console.log(`📖 [ContentApi] Fetching content ${contentId}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.get<{
        success: boolean;
        data: SpaceContent;
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch content');
      }

      console.log(`✅ [ContentApi] Fetched content ${contentId}`);

      return response.data;

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to fetch content:', error);
      throw new Error(error.message || 'Failed to fetch content');
    }
  }

  /**
   * Search content across spaces
   */
  async searchContent(params: {
    query: string;
    communityId?: string;
    spaceId?: string;
    type?: 'posts' | 'messages';
    limit?: number;
    offset?: number;
  }): Promise<SpaceContentResponse> {
    const { query, communityId, spaceId, type, limit = 20, offset = 0 } = params;

    try {
      const queryParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (communityId) queryParams.append('communityId', communityId);
      if (spaceId) queryParams.append('spaceId', spaceId);
      if (type) queryParams.append('type', type);

      const endpoint = `/posts/search?${queryParams.toString()}`;
      
      console.log(`🔍 [ContentApi] Searching content: ${query}`);
      
      const apiStore = this.getApiStore();
      const response = await apiStore.get<{
        success: boolean;
        data: {
          posts: SpaceContent[];
          total: number;
          hasMore: boolean;
          currentPage: number;
          totalPages: number;
        };
        message: string;
      }>(endpoint);

      if (!response.success) {
        throw new Error(response.message || 'Failed to search content');
      }

      console.log(`✅ [ContentApi] Found ${response.data.posts.length} results for: ${query}`);

      return {
        data: response.data.posts,
        total: response.data.total,
        hasMore: response.data.hasMore,
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
      };

    } catch (error: any) {
      console.error('❌ [ContentApi] Failed to search content:', error);
      throw new Error(error.message || 'Failed to search content');
    }
  }
}

// Export singleton instance
export const contentApi = new ContentApiService();
