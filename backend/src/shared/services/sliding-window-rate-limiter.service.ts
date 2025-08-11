import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  timeToReset: number; // Time until window resets (ms)
  remainingRequests: number;
}

export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 attempts per hour
  PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 attempts per hour
  EMAIL_VERIFICATION: { windowMs: 5 * 60 * 1000, maxRequests: 3 }, // 3 attempts per 5 minutes

  // API endpoints
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  API_STRICT: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 requests per minute
  
  // Messaging endpoints
  MESSAGE_SEND: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 messages per minute
  MESSAGE_EDIT: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 edits per minute
  
  // Community actions
  COMMUNITY_CREATE: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 communities per hour
  COMMUNITY_JOIN: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 joins per minute
  
  // Space actions
  SPACE_CREATE: { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // 20 spaces per hour
  SPACE_JOIN: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 joins per minute
  
  // File uploads
  FILE_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
  
  // Search
  SEARCH: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 searches per minute
} as const;

@Injectable()
export class SlidingWindowRateLimiterService {
  private readonly logger = new Logger(SlidingWindowRateLimiterService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Check if request is rate limited using sliding window algorithm
   */
  async isRateLimited(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator ? 
      config.keyGenerator(identifier) : 
      `rate_limit:${identifier}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Get current window data
      const windowData = await this.getWindowData(key);
      
      // Clean old entries outside the window
      const validEntries = windowData.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      const currentCount = validEntries.length;
      const allowed = currentCount < config.maxRequests;
      
      if (allowed) {
        // Add current request timestamp
        validEntries.push(now);
        await this.setWindowData(key, validEntries, config.windowMs);
      }

      // Calculate time to reset (when oldest entry expires)
      const oldestEntry = Math.min(...validEntries);
      const timeToReset = oldestEntry + config.windowMs - now;

      return {
        allowed,
        totalHits: currentCount + (allowed ? 1 : 0),
        timeToReset: Math.max(0, timeToReset),
        remainingRequests: Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0)),
      };
    } catch (error) {
      this.logger.error(`Rate limiting error for key ${key}:`, error);
      // Fail open - allow request if there's an error
      return {
        allowed: true,
        totalHits: 0,
        timeToReset: 0,
        remainingRequests: config.maxRequests,
      };
    }
  }

  /**
   * Check rate limit for login attempts
   */
  async checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.isRateLimited(identifier, {
      ...RATE_LIMIT_CONFIGS.LOGIN,
      keyGenerator: (id) => `login:${id}`,
    });
  }

  /**
   * Check rate limit for API requests
   */
  async checkApiRateLimit(identifier: string, strict = false): Promise<RateLimitResult> {
    const config = strict ? RATE_LIMIT_CONFIGS.API_STRICT : RATE_LIMIT_CONFIGS.API_GENERAL;
    return this.isRateLimited(identifier, {
      ...config,
      keyGenerator: (id) => `api:${id}`,
    });
  }

  /**
   * Check rate limit for message sending
   */
  async checkMessageRateLimit(userId: string): Promise<RateLimitResult> {
    return this.isRateLimited(userId, {
      ...RATE_LIMIT_CONFIGS.MESSAGE_SEND,
      keyGenerator: (id) => `message:${id}`,
    });
  }

  /**
   * Check rate limit for community actions
   */
  async checkCommunityActionRateLimit(
    userId: string, 
    action: 'create' | 'join'
  ): Promise<RateLimitResult> {
    const config = action === 'create' ? 
      RATE_LIMIT_CONFIGS.COMMUNITY_CREATE : 
      RATE_LIMIT_CONFIGS.COMMUNITY_JOIN;
    
    return this.isRateLimited(userId, {
      ...config,
      keyGenerator: (id) => `community:${action}:${id}`,
    });
  }

  /**
   * Check rate limit for space actions
   */
  async checkSpaceActionRateLimit(
    userId: string, 
    action: 'create' | 'join'
  ): Promise<RateLimitResult> {
    const config = action === 'create' ? 
      RATE_LIMIT_CONFIGS.SPACE_CREATE : 
      RATE_LIMIT_CONFIGS.SPACE_JOIN;
    
    return this.isRateLimited(userId, {
      ...config,
      keyGenerator: (id) => `space:${action}:${id}`,
    });
  }

  /**
   * Check rate limit for file uploads
   */
  async checkFileUploadRateLimit(userId: string): Promise<RateLimitResult> {
    return this.isRateLimited(userId, {
      ...RATE_LIMIT_CONFIGS.FILE_UPLOAD,
      keyGenerator: (id) => `upload:${id}`,
    });
  }

  /**
   * Check rate limit for search requests
   */
  async checkSearchRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.isRateLimited(identifier, {
      ...RATE_LIMIT_CONFIGS.SEARCH,
      keyGenerator: (id) => `search:${id}`,
    });
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string, type: string): Promise<void> {
    const key = `rate_limit:${type}:${identifier}`;
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Rate limit reset for ${key}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for ${key}:`, error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator ? 
      config.keyGenerator(identifier) : 
      `rate_limit:${identifier}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const windowData = await this.getWindowData(key);
      const validEntries = windowData.filter(timestamp => timestamp > windowStart);
      const currentCount = validEntries.length;
      
      const oldestEntry = Math.min(...validEntries);
      const timeToReset = oldestEntry + config.windowMs - now;

      return {
        allowed: currentCount < config.maxRequests,
        totalHits: currentCount,
        timeToReset: Math.max(0, timeToReset),
        remainingRequests: Math.max(0, config.maxRequests - currentCount),
      };
    } catch (error) {
      this.logger.error(`Error getting rate limit status for ${key}:`, error);
      return {
        allowed: true,
        totalHits: 0,
        timeToReset: 0,
        remainingRequests: config.maxRequests,
      };
    }
  }

  /**
   * Get window data from cache
   */
  private async getWindowData(key: string): Promise<number[]> {
    try {
      const data = await this.cacheManager.get<number[]>(key);
      return data || [];
    } catch (error) {
      this.logger.error(`Error getting window data for ${key}:`, error);
      return [];
    }
  }

  /**
   * Set window data in cache
   */
  private async setWindowData(key: string, data: number[], ttlMs: number): Promise<void> {
    try {
      // Convert TTL from milliseconds to seconds for cache manager
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.cacheManager.set(key, data, ttlSeconds * 1000);
    } catch (error) {
      this.logger.error(`Error setting window data for ${key}:`, error);
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getRateLimitStats(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    blockRate: number;
  }> {
    // This would need to be implemented based on your monitoring needs
    return {
      totalRequests: 0,
      blockedRequests: 0,
      blockRate: 0,
    };
  }
}
