import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key: string; // Cache key prefix
  tags?: string[]; // Cache tags for invalidation
}

export const CACHE_LAYERS = {
  USER_PROFILE: { ttl: 3600, key: 'user:profile:', tags: ['user'] },
  USER_SESSION: { ttl: 1800, key: 'user:session:', tags: ['user', 'session'] },
  COMMUNITY_DETAILS: { ttl: 1800, key: 'community:details:', tags: ['community'] },
  COMMUNITY_MEMBERS: { ttl: 900, key: 'community:members:', tags: ['community', 'members'] },
  SPACE_DETAILS: { ttl: 1800, key: 'space:details:', tags: ['space'] },
  SPACE_PERMISSIONS: { ttl: 900, key: 'space:permissions:', tags: ['space', 'permissions'] },
  CONVERSATION_PARTICIPANTS: { ttl: 600, key: 'conversation:participants:', tags: ['conversation'] },
  MESSAGE_THREAD: { ttl: 300, key: 'message:thread:', tags: ['message'] },
  ONLINE_USERS: { ttl: 60, key: 'online:users:', tags: ['presence'] },
  RATE_LIMIT: { ttl: 3600, key: 'rate:limit:', tags: ['rate_limit'] },
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetchFunction();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Note: This is a simplified implementation
      // In production, you might want to use Redis SCAN or similar
      this.logger.debug(`Cache invalidation pattern: ${pattern}`);
      
      // For now, we'll implement specific invalidation methods
      // This would need to be enhanced based on your cache backend
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_LAYERS.USER_PROFILE.key}${userId}`,
      `${CACHE_LAYERS.USER_SESSION.key}${userId}:*`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }

    this.logger.debug(`Invalidated user cache for user: ${userId}`);
  }

  /**
   * Invalidate community-related cache
   */
  async invalidateCommunityCache(communityId: string): Promise<void> {
    const patterns = [
      `${CACHE_LAYERS.COMMUNITY_DETAILS.key}${communityId}`,
      `${CACHE_LAYERS.COMMUNITY_MEMBERS.key}${communityId}:*`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }

    this.logger.debug(`Invalidated community cache for community: ${communityId}`);
  }

  /**
   * Invalidate space-related cache
   */
  async invalidateSpaceCache(spaceId: string): Promise<void> {
    const patterns = [
      `${CACHE_LAYERS.SPACE_DETAILS.key}${spaceId}`,
      `${CACHE_LAYERS.SPACE_PERMISSIONS.key}${spaceId}:*`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }

    this.logger.debug(`Invalidated space cache for space: ${spaceId}`);
  }

  /**
   * Invalidate conversation-related cache
   */
  async invalidateConversationCache(conversationId: string): Promise<void> {
    const patterns = [
      `${CACHE_LAYERS.CONVERSATION_PARTICIPANTS.key}${conversationId}`,
      `${CACHE_LAYERS.MESSAGE_THREAD.key}${conversationId}:*`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }

    this.logger.debug(`Invalidated conversation cache for conversation: ${conversationId}`);
  }

  /**
   * Cache user profile with standard TTL
   */
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const key = `${CACHE_LAYERS.USER_PROFILE.key}${userId}`;
    await this.set(key, profile, CACHE_LAYERS.USER_PROFILE.ttl);
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any> {
    const key = `${CACHE_LAYERS.USER_PROFILE.key}${userId}`;
    return this.get(key);
  }

  /**
   * Cache community members with standard TTL
   */
  async cacheCommunityMembers(communityId: string, members: any[], options?: any): Promise<void> {
    const optionsKey = options ? `:${JSON.stringify(options)}` : '';
    const key = `${CACHE_LAYERS.COMMUNITY_MEMBERS.key}${communityId}${optionsKey}`;
    await this.set(key, members, CACHE_LAYERS.COMMUNITY_MEMBERS.ttl);
  }

  /**
   * Get cached community members
   */
  async getCachedCommunityMembers(communityId: string, options?: any): Promise<any[]> {
    const optionsKey = options ? `:${JSON.stringify(options)}` : '';
    const key = `${CACHE_LAYERS.COMMUNITY_MEMBERS.key}${communityId}${optionsKey}`;
    return this.get(key);
  }

  /**
   * Cache space permissions with standard TTL
   */
  async cacheSpacePermissions(spaceId: string, userId: string, permissions: any): Promise<void> {
    const key = `${CACHE_LAYERS.SPACE_PERMISSIONS.key}${spaceId}:${userId}`;
    await this.set(key, permissions, CACHE_LAYERS.SPACE_PERMISSIONS.ttl);
  }

  /**
   * Get cached space permissions
   */
  async getCachedSpacePermissions(spaceId: string, userId: string): Promise<any> {
    const key = `${CACHE_LAYERS.SPACE_PERMISSIONS.key}${spaceId}:${userId}`;
    return this.get(key);
  }

  /**
   * Cache online users with short TTL
   */
  async cacheOnlineUsers(conversationId: string, users: any[]): Promise<void> {
    const key = `${CACHE_LAYERS.ONLINE_USERS.key}${conversationId}`;
    await this.set(key, users, CACHE_LAYERS.ONLINE_USERS.ttl);
  }

  /**
   * Get cached online users
   */
  async getCachedOnlineUsers(conversationId: string): Promise<any[]> {
    const key = `${CACHE_LAYERS.ONLINE_USERS.key}${conversationId}`;
    return this.get(key);
  }

  /**
   * Get cache statistics (for monitoring)
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    // This would need to be implemented based on your cache backend
    // For now, return mock data
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.warn('All cache cleared');
    } catch (error) {
      this.logger.error('Error clearing all cache:', error);
    }
  }
}
