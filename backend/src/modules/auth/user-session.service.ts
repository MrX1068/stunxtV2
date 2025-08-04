import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

import { 
  UserSession, 
  SessionStatus, 
  DeviceType 
} from '../../shared/entities/user-session.entity';
import { User } from '../../shared/entities/user.entity';

export interface DeviceInfo {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  deviceName?: string;
  operatingSystem?: string;
  browserName?: string;
  browserVersion?: string;
  locationInfo?: Record<string, any>;
}

@Injectable()
export class UserSessionService {
  private readonly logger = new Logger(UserSessionService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new user session - supports both simple and detailed parameters
   */
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<UserSession>;
  async createSession(user: User, deviceInfo: DeviceInfo): Promise<UserSession>;
  async createSession(
    userOrUserId: User | string,
    deviceInfoOrIpAddress?: DeviceInfo | string,
    userAgent?: string,
  ): Promise<UserSession> {
    // Handle overloaded parameters
    let user: User;
    let deviceInfo: DeviceInfo;

    if (typeof userOrUserId === 'string') {
      // Simple parameters version
      const userId = userOrUserId;
      const ipAddress = deviceInfoOrIpAddress as string;
      user = { id: userId } as User;
      deviceInfo = {
        ipAddress,
        userAgent: userAgent!,
      };
    } else {
      // Full user object version
      user = userOrUserId;
      deviceInfo = deviceInfoOrIpAddress as DeviceInfo;
    }

    // Generate unique session tokens
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Hash tokens for storage
    const tokenHash = await argon2.hash(sessionToken);
    const refreshTokenHash = await argon2.hash(refreshToken);

    // Generate device ID if not provided
    const deviceId = deviceInfo.deviceId || this.generateDeviceId(deviceInfo);

    // Determine device type from user agent
    const deviceType = this.determineDeviceType(deviceInfo.userAgent);

    // Calculate expiration time
    const sessionTimeout = this.configService.get<number>('security.sessionTimeout', 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + sessionTimeout);

    // Create session
    const session = this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      refreshTokenHash,
      status: SessionStatus.ACTIVE,
      deviceId,
      deviceType,
      deviceName: deviceInfo.deviceName || this.extractDeviceName(deviceInfo.userAgent),
      operatingSystem: deviceInfo.operatingSystem || this.extractOS(deviceInfo.userAgent),
      browserName: deviceInfo.browserName || this.extractBrowserName(deviceInfo.userAgent),
      browserVersion: deviceInfo.browserVersion || this.extractBrowserVersion(deviceInfo.userAgent),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      locationInfo: deviceInfo.locationInfo || {},
      expiresAt,
      lastActivityAt: new Date(),
      metadata: {
        sessionToken, // Store unhashed token for JWT generation
        refreshToken, // Store unhashed token for JWT generation
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedSession = await this.sessionRepository.save(session);

    return savedSession;
  }

  async findValidSession(sessionId: string, userId: string): Promise<UserSession | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          id: sessionId,
          userId,
          status: SessionStatus.ACTIVE,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!session) {
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  async updateSessionActivity(sessionId: string, deviceInfo: Partial<DeviceInfo>): Promise<void> {
    try {
      const updateData: Partial<UserSession> = {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };

      if (deviceInfo.ipAddress) {
        updateData.ipAddress = deviceInfo.ipAddress;
      }

      if (deviceInfo.userAgent) {
        updateData.userAgent = deviceInfo.userAgent;
      }

      await this.sessionRepository.update(sessionId, updateData);
      
    } catch (error) {
      throw error;
    }
  }

  async validateSessionToken(sessionToken: string, sessionId: string): Promise<UserSession | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          id: sessionId,
          status: SessionStatus.ACTIVE,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!session) {
        return null;
      }

      // Verify token hash
      const isValid = await argon2.verify(session.tokenHash, sessionToken);
      if (!isValid) {
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user active sessions with sanitized data (no sensitive tokens)
   */
  async getUserActiveSessionsSanitized(userId: string, currentSessionId?: string): Promise<any[]> {
    try {
      const sessions = await this.sessionRepository.find({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
          expiresAt: MoreThan(new Date()),
        },
        order: {
          lastActivityAt: 'DESC',
        },
      });

      // Return sanitized session data
      return sessions.map(session => ({
        id: session.id,
        deviceInfo: session.getDeviceInfo(),
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
        location: session.getLocationString(),
        isCurrentSession: session.id === currentSessionId,
        lastActivity: session.lastActivityAt,
        createdAt: session.createdAt,
        // Exclude sensitive fields: tokenHash, refreshTokenHash, userAgent, metadata
      }));
    } catch (error) {
      return [];
    }
  }

  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      return await this.sessionRepository.find({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
          expiresAt: MoreThan(new Date()),
        },
        order: {
          lastActivityAt: 'DESC',
        },
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, {
        status: SessionStatus.REVOKED,
        updatedAt: new Date(),
      });
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      await this.sessionRepository.update(
        { 
          userId,
          status: SessionStatus.ACTIVE,
        },
        {
          status: SessionStatus.REVOKED,
          updatedAt: new Date(),
        }
      );
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user except one
   */
  async invalidateUserSessionsExcept(userId: string, exceptSessionId: string): Promise<void> {
    try {
      await this.sessionRepository
        .createQueryBuilder()
        .update(UserSession)
        .set({
          status: SessionStatus.REVOKED,
          updatedAt: new Date(),
        })
        .where('userId = :userId', { userId })
        .andWhere('id != :exceptSessionId', { exceptSessionId })
        .andWhere('status = :status', { status: SessionStatus.ACTIVE })
        .execute();
      
    } catch (error) {
      throw error;
    }
  }

  async getSessionById(sessionId: string): Promise<UserSession | null> {
    try {
      return await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
    } catch (error) {
      return null;
    }
  }

  async getAllUserSessions(userId: string): Promise<UserSession[]> {
    try {
      return await this.sessionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      return [];
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.sessionRepository.update(
        {
          status: SessionStatus.ACTIVE,
          expiresAt: LessThan(new Date()),
        },
        {
          status: SessionStatus.EXPIRED,
          updatedAt: new Date(),
        }
      );

      return result.affected || 0;
    } catch (error) {
      return 0;
    }
  }

  async getSuspiciousSessions(userId: string): Promise<UserSession[]> {
    // Find sessions with unusual patterns
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.sessionRepository
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.created_at > :oneDayAgo', { oneDayAgo })
      .andWhere('session.status = :status', { status: SessionStatus.ACTIVE })
      .groupBy('session.ip_address')
      .having('COUNT(*) > :threshold', { threshold: 3 })
      .getMany();
  }

  // Private helper methods
  private generateDeviceId(deviceInfo: DeviceInfo): string {
    const data = `${deviceInfo.userAgent}${deviceInfo.ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private determineDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return DeviceType.MOBILE;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  private extractDeviceName(userAgent: string): string {
    // Extract device name from user agent
    const ua = userAgent;
    
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux PC';
    
    return 'Unknown Device';
  }

  private extractOS(userAgent: string): string {
    const ua = userAgent;
    
    if (ua.includes('Windows NT 10.0')) return 'Windows 10';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone OS')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    
    return 'Unknown OS';
  }

  private extractBrowserName(userAgent: string): string {
    const ua = userAgent;
    
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('Chrome/') && !ua.includes('Chromium/')) return 'Google Chrome';
    if (ua.includes('Firefox/')) return 'Mozilla Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
    
    return 'Unknown Browser';
  }

  private extractBrowserVersion(userAgent: string): string {
    const ua = userAgent;
    
    let version = 'Unknown';
    
    if (ua.includes('Chrome/')) {
      const match = ua.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox/')) {
      const match = ua.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari/')) {
      const match = ua.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    return version;
  }

  /**
   * Update session with refresh token data (Enterprise Grade)
   */
  async updateSessionRefreshToken(
    sessionId: string,
    refreshTokenData: {
      refreshTokenHash: string;
      refreshTokenExpiresAt: Date;
      lastRefreshedAt: Date;
    }
  ): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, refreshTokenData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sessions with valid refresh tokens
   */
  async getSessionsWithRefreshTokens(): Promise<UserSession[]> {
    try {
      return await this.sessionRepository.find({
        where: {
          status: SessionStatus.ACTIVE,
          refreshTokenExpiresAt: MoreThan(new Date()),
        },
        select: ['id', 'userId', 'refreshTokenHash', 'refreshTokenExpiresAt', 'status'],
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear refresh token from session
   */
  async clearRefreshToken(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        status: SessionStatus.EXPIRED,
      });
    } catch (error) {
      throw error;
    }
  }
}
