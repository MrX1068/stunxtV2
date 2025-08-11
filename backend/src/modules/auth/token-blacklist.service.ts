import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as crypto from 'crypto';

export interface BlacklistedToken {
  id: string;
  tokenHash: string;
  tokenType: 'access' | 'refresh';
  userId: string;
  sessionId: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly CACHE_PREFIX = 'blacklist:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Add token to blacklist
   */
  async blacklistToken(
    token: string,
    tokenType: 'access' | 'refresh',
    userId: string,
    sessionId: string,
    reason: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      // Hash the token for storage (never store raw tokens)
      const tokenHash = this.hashToken(token);
      const cacheKey = `${this.CACHE_PREFIX}${tokenHash}`;

      // Store in cache for fast lookup
      const blacklistEntry = {
        tokenHash,
        tokenType,
        userId,
        sessionId,
        reason,
        expiresAt,
        createdAt: new Date(),
      };

      await this.cacheManager.set(cacheKey, blacklistEntry, this.CACHE_TTL);

      this.logger.debug(`Token blacklisted: ${tokenType} for user ${userId}, reason: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to blacklist token:', error);
      throw new Error('Token blacklisting failed');
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      const cacheKey = `${this.CACHE_PREFIX}${tokenHash}`;

      const blacklistEntry = await this.cacheManager.get(cacheKey);
      
      if (blacklistEntry) {
        // Check if blacklist entry is still valid
        const entry = blacklistEntry as BlacklistedToken;
        if (new Date() < entry.expiresAt) {
          return true;
        } else {
          // Clean up expired entry
          await this.cacheManager.del(cacheKey);
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking token blacklist:', error);
      // Fail secure - if we can't check, assume it's blacklisted
      return true;
    }
  }

  /**
   * Blacklist all tokens for a user (e.g., on password change)
   */
  async blacklistAllUserTokens(userId: string, reason: string = 'Security action'): Promise<void> {
    try {
      // This would require getting all active sessions for the user
      // For now, we'll use a user-level blacklist marker
      const userBlacklistKey = `${this.CACHE_PREFIX}user:${userId}`;
      const blacklistEntry = {
        userId,
        reason,
        timestamp: new Date(),
        type: 'user_blacklist',
      };

      await this.cacheManager.set(userBlacklistKey, blacklistEntry, this.CACHE_TTL * 24); // 24 hours

      this.logger.warn(`All tokens blacklisted for user ${userId}, reason: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to blacklist user tokens:', error);
      throw new Error('User token blacklisting failed');
    }
  }

  /**
   * Check if all user tokens are blacklisted
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    try {
      const userBlacklistKey = `${this.CACHE_PREFIX}user:${userId}`;
      const blacklistEntry = await this.cacheManager.get(userBlacklistKey);
      return !!blacklistEntry;
    } catch (error) {
      this.logger.error('Error checking user blacklist:', error);
      return false;
    }
  }

  /**
   * Remove token from blacklist (rarely used)
   */
  async removeTokenFromBlacklist(token: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);
      const cacheKey = `${this.CACHE_PREFIX}${tokenHash}`;
      await this.cacheManager.del(cacheKey);
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist:', error);
    }
  }

  /**
   * Clear user blacklist (e.g., after security review)
   */
  async clearUserBlacklist(userId: string): Promise<void> {
    try {
      const userBlacklistKey = `${this.CACHE_PREFIX}user:${userId}`;
      await this.cacheManager.del(userBlacklistKey);
      this.logger.log(`User blacklist cleared for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to clear user blacklist:', error);
    }
  }

  /**
   * Periodic cleanup of expired blacklist entries
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredEntries(): Promise<void> {
    try {
      this.logger.debug('Starting blacklist cleanup...');
      // Cache entries will auto-expire, but we can add additional cleanup logic here
      // For database-backed blacklist, we would clean up expired entries
    } catch (error) {
      this.logger.error('Blacklist cleanup failed:', error);
    }
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get blacklist statistics (for monitoring)
   */
  async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    userBlacklists: number;
  }> {
    // This would require scanning cache or database
    // For now, return basic stats
    return {
      totalBlacklisted: 0,
      userBlacklists: 0,
    };
  }
}
