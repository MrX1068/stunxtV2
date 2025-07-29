import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LoginAttempt, AttemptResult, AttemptType } from '../../shared/entities/login-attempt.entity';

export interface SuspiciousActivityInfo {
  isHighRisk: boolean;
  riskScore: number;
  reasons: string[];
  shouldBlock: boolean;
  requiresManualReview: boolean;
}

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);

  constructor(
    @InjectRepository(LoginAttempt)
    private readonly attemptRepository: Repository<LoginAttempt>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if a user/IP is currently rate limited
   */
  async isRateLimited(email: string, ipAddress: string): Promise<boolean> {
    const maxAttempts = this.configService.get<number>('security.maxLoginAttempts', 5);
    const lockoutDuration = this.configService.get<number>('security.lockoutDuration', 30 * 60 * 1000);
    const timeWindow = new Date(Date.now() - lockoutDuration);

    // Count failed attempts in the time window
    const failedAttempts = await this.attemptRepository.count({
      where: [
        {
          email,
          result: AttemptResult.FAILED_PASSWORD,
          createdAt: MoreThan(timeWindow),
        },
        {
          ipAddress,
          result: AttemptResult.FAILED_PASSWORD,
          createdAt: MoreThan(timeWindow),
        },
      ],
    });

    return failedAttempts >= maxAttempts;
  }

  /**
   * Record a login attempt
   */
  async recordAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    result: AttemptResult,
    type: AttemptType = AttemptType.LOGIN,
    additionalInfo?: Record<string, any>,
  ): Promise<LoginAttempt> {
    this.logger.log(`Recording login attempt: ${email} - ${result} - ${type}`);
    
    const geoInfo = await this.getGeoInfo(ipAddress);
    const deviceInfo = this.parseUserAgent(userAgent);
    
    const attempt = this.attemptRepository.create({
      email,
      userId: additionalInfo?.userId || null, // Make sure userId is included
      ipAddress,
      userAgent,
      result,
      type,
      locationInfo: geoInfo ? { country: geoInfo.country, city: geoInfo.city } : {},
      metadata: {
        ...additionalInfo,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        operatingSystem: deviceInfo.os,
      },
    });

    const savedAttempt = await this.attemptRepository.save(attempt);
    
    this.logger.log(`Login attempt saved with ID: ${savedAttempt.id}, userId: ${savedAttempt.userId}`);

    // Log suspicious activity
    if (result !== AttemptResult.SUCCESS) {
      const suspiciousInfo = await this.analyzeSuspiciousActivity(email, ipAddress);
      if (suspiciousInfo.isHighRisk) {
        this.logger.warn(`High-risk login attempt detected`, {
          email,
          ipAddress,
          riskScore: suspiciousInfo.riskScore,
          reasons: suspiciousInfo.reasons,
        });
      }
    }

    return savedAttempt;
  }

  /**
   * Get recent failed attempts for a user/IP
   */
  async getRecentFailedAttempts(
    email: string,
    ipAddress: string,
    hours: number = 24,
  ): Promise<LoginAttempt[]> {
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.attemptRepository.find({
      where: [
        {
          email,
          result: AttemptResult.FAILED_PASSWORD,
          createdAt: MoreThan(timeWindow),
        },
        {
          ipAddress,
          result: AttemptResult.FAILED_PASSWORD,
          createdAt: MoreThan(timeWindow),
        },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Analyze suspicious activity patterns
   */
  async analyzeSuspiciousActivity(
    email: string,
    ipAddress: string,
  ): Promise<SuspiciousActivityInfo> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent attempts
    const recentAttempts = await this.attemptRepository.find({
      where: [
        { email, createdAt: MoreThan(last24Hours) },
        { ipAddress, createdAt: MoreThan(last24Hours) },
      ],
      order: { createdAt: 'DESC' },
    });

    const weeklyAttempts = await this.attemptRepository.find({
      where: [
        { email, createdAt: MoreThan(lastWeek) },
        { ipAddress, createdAt: MoreThan(lastWeek) },
      ],
    });

    let riskScore = 0;
    const reasons: string[] = [];

    // Pattern analysis
    const failedCount24h = recentAttempts.filter(
      a => a.result !== AttemptResult.SUCCESS
    ).length;
    
    const differentIPs = new Set(
      recentAttempts.filter(a => a.email === email).map(a => a.ipAddress)
    ).size;
    
    const differentLocations = new Set(
      recentAttempts.filter(a => a.email === email)
        .map(a => `${a.locationInfo?.country || 'unknown'}-${a.locationInfo?.city || 'unknown'}`)
    ).size;

    const rapidAttempts = this.detectRapidAttempts(recentAttempts);
    const isFromUnknownLocation = await this.isFromUnknownLocation(email, ipAddress);
    const hasUnusualPattern = this.detectUnusualPatterns(recentAttempts);

    // Risk scoring
    if (failedCount24h > 10) {
      riskScore += 30;
      reasons.push(`High number of failed attempts: ${failedCount24h}`);
    } else if (failedCount24h > 5) {
      riskScore += 15;
      reasons.push(`Moderate failed attempts: ${failedCount24h}`);
    }

    if (differentIPs > 5) {
      riskScore += 25;
      reasons.push(`Multiple IP addresses: ${differentIPs}`);
    } else if (differentIPs > 2) {
      riskScore += 10;
      reasons.push(`Several IP addresses: ${differentIPs}`);
    }

    if (differentLocations > 3) {
      riskScore += 20;
      reasons.push(`Multiple locations: ${differentLocations}`);
    }

    if (rapidAttempts.detected) {
      riskScore += rapidAttempts.severity;
      reasons.push(`Rapid attempts detected: ${rapidAttempts.description}`);
    }

    if (isFromUnknownLocation) {
      riskScore += 15;
      reasons.push('Login from unknown location');
    }

    if (hasUnusualPattern.detected) {
      riskScore += hasUnusualPattern.severity;
      reasons.push(`Unusual pattern: ${hasUnusualPattern.description}`);
    }

    // Velocity checks
    const recentSuccessfulAttempts = recentAttempts.filter(
      a => a.result === AttemptResult.SUCCESS
    );
    
    if (recentSuccessfulAttempts.length > 0) {
      const timeSinceLastSuccess = now.getTime() - recentSuccessfulAttempts[0].createdAt.getTime();
      if (timeSinceLastSuccess < 5 * 60 * 1000 && failedCount24h > 3) {
        riskScore += 20;
        reasons.push('Failed attempts shortly after successful login');
      }
    }

    return {
      isHighRisk: riskScore >= 50,
      riskScore,
      reasons,
      shouldBlock: riskScore >= 80,
      requiresManualReview: riskScore >= 70,
    };
  }

  /**
   * Detect rapid login attempts (potential brute force)
   */
  private detectRapidAttempts(attempts: LoginAttempt[]): {
    detected: boolean;
    severity: number;
    description: string;
  } {
    if (attempts.length < 3) {
      return { detected: false, severity: 0, description: '' };
    }

    // Sort by time
    const sortedAttempts = attempts.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Check for rapid succession (within 1 minute)
    let rapidCount = 0;
    for (let i = 0; i < sortedAttempts.length - 1; i++) {
      const timeDiff = sortedAttempts[i].createdAt.getTime() - 
                      sortedAttempts[i + 1].createdAt.getTime();
      if (timeDiff < 60 * 1000) { // Less than 1 minute
        rapidCount++;
      }
    }

    if (rapidCount >= 5) {
      return {
        detected: true,
        severity: 25,
        description: `${rapidCount} attempts within minutes`,
      };
    } else if (rapidCount >= 3) {
      return {
        detected: true,
        severity: 15,
        description: `${rapidCount} rapid attempts detected`,
      };
    }

    return { detected: false, severity: 0, description: '' };
  }

  /**
   * Check if login is from an unknown location
   */
  private async isFromUnknownLocation(email: string, ipAddress: string): Promise<boolean> {
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const knownLocations = await this.attemptRepository.find({
      where: {
        email,
        result: AttemptResult.SUCCESS,
        createdAt: MoreThan(lastMonth),
      },
      select: ['locationInfo'],
    });

    if (knownLocations.length === 0) {
      return false; // No history to compare
    }

    const currentGeo = await this.getGeoInfo(ipAddress);
    if (!currentGeo) {
      return true; // Can't determine location
    }

    return !knownLocations.some(
      loc => loc.locationInfo?.country === currentGeo.country && 
             loc.locationInfo?.city === currentGeo.city
    );
  }

  /**
   * Detect unusual patterns in login attempts
   */
  private detectUnusualPatterns(attempts: LoginAttempt[]): {
    detected: boolean;
    severity: number;
    description: string;
  } {
    if (attempts.length < 5) {
      return { detected: false, severity: 0, description: '' };
    }

    // Check for consistent intervals (automation)
    const intervals: number[] = [];
    for (let i = 0; i < attempts.length - 1; i++) {
      const interval = attempts[i].createdAt.getTime() - attempts[i + 1].createdAt.getTime();
      intervals.push(interval);
    }

    // Check if intervals are suspiciously regular
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgInterval;

    if (coefficientOfVariation < 0.1 && intervals.length >= 5) {
      return {
        detected: true,
        severity: 20,
        description: 'Automated/scripted login pattern detected',
      };
    }

    // Check for unusual timing patterns
    const hourCounts = new Array(24).fill(0);
    attempts.forEach(attempt => {
      const hour = attempt.createdAt.getHours();
      hourCounts[hour]++;
    });

    const maxHourlyAttempts = Math.max(...hourCounts);
    if (maxHourlyAttempts >= attempts.length * 0.7) {
      return {
        detected: true,
        severity: 10,
        description: 'Unusual time concentration detected',
      };
    }

    return { detected: false, severity: 0, description: '' };
  }

  /**
   * Get geographical information for an IP address
   */
  private async getGeoInfo(ipAddress: string): Promise<{
    country: string;
    city: string;
  } | null> {
    try {
      // In a real implementation, you would use a GeoIP service
      // For now, return null to indicate geo info is unavailable
      return null;
    } catch (error) {
      this.logger.error(`Failed to get geo info for IP ${ipAddress}:`, error);
      return null;
    }
  }

  /**
   * Parse user agent string to extract device information
   */
  private parseUserAgent(userAgent: string): {
    deviceType: string;
    browser: string;
    os: string;
  } {
    // Basic user agent parsing - in production, use a proper library
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  }

  /**
   * Clean up old login attempts
   */
  async cleanupOldAttempts(): Promise<void> {
    const retentionDays = this.configService.get<number>('security.loginAttemptRetention', 90);
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await this.attemptRepository.delete({
      createdAt: MoreThan(cutoffDate),
    });

    this.logger.log(`Cleaned up ${deleted.affected || 0} old login attempts`);
  }

  /**
   * Get login attempt statistics
   */
  async getAttemptStats(email?: string, days: number = 30): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    uniqueIPs: number;
    topCountries: Array<{ country: string; count: number }>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const whereClause: any = {
      createdAt: MoreThan(since),
    };
    
    if (email) {
      whereClause.email = email;
    }

    const attempts = await this.attemptRepository.find({
      where: whereClause,
    });

    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter(a => a.result === AttemptResult.SUCCESS).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    // Top failure reasons
    const failureReasons = new Map<string, number>();
    attempts.filter(a => a.result !== AttemptResult.SUCCESS).forEach(attempt => {
      const count = failureReasons.get(attempt.result) || 0;
      failureReasons.set(attempt.result, count + 1);
    });

    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Unique IPs
    const uniqueIPs = new Set(attempts.map(a => a.ipAddress)).size;

    // Top countries
    const countries = new Map<string, number>();
    attempts.forEach(attempt => {
      if (attempt.locationInfo?.country) {
        const count = countries.get(attempt.locationInfo.country) || 0;
        countries.set(attempt.locationInfo.country, count + 1);
      }
    });

    const topCountries = Array.from(countries.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate,
      topFailureReasons,
      uniqueIPs,
      topCountries,
    };
  }

  /**
   * Get user's login attempts since a specific date
   */
  async getUserAttempts(userId: string, since: Date): Promise<LoginAttempt[]> {
    try {
      this.logger.log(`Getting attempts for userId: ${userId} since: ${since.toISOString()}`);
      
      const attempts = await this.attemptRepository.find({
        where: {
          userId,
          createdAt: MoreThan(since),
        },
        order: {
          createdAt: 'DESC',
        },
      });
      
      this.logger.log(`Found ${attempts.length} attempts for user ${userId}`);
      
      // Also try finding by email for debugging
      const attemptsByEmail = await this.attemptRepository.find({
        where: {
          email: userId, // This might be wrong - let's see what's actually stored
          createdAt: MoreThan(since),
        },
        order: {
          createdAt: 'DESC',
        },
      });
      
      this.logger.log(`Found ${attemptsByEmail.length} attempts by email search`);
      
      // Let's also get all recent attempts to see what's there
      const allRecentAttempts = await this.attemptRepository.find({
        where: {
          createdAt: MoreThan(since),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      });
      
      this.logger.log(`Total recent attempts: ${allRecentAttempts.length}`);
      allRecentAttempts.forEach(attempt => {
        this.logger.log(`Attempt: userId=${attempt.userId}, email=${attempt.email}, result=${attempt.result}`);
      });
      
      return attempts;
    } catch (error) {
      this.logger.error(`Error getting user attempts for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get debug information about login attempts
   */
  async getDebugAttempts(userId?: string, email?: string): Promise<any> {
    try {
      const results: any = {};

      if (userId) {
        const attemptsByUserId = await this.attemptRepository.find({
          where: { userId },
          order: { createdAt: 'DESC' },
          take: 10,
        });

        const totalByUserId = await this.attemptRepository.count({
          where: { userId },
        });

        results.byUserId = {
          count: totalByUserId,
          recent: attemptsByUserId,
        };
      }

      if (email) {
        const attemptsByEmail = await this.attemptRepository.find({
          where: { email },
          order: { createdAt: 'DESC' },
          take: 10,
        });

        const totalByEmail = await this.attemptRepository.count({
          where: { email },
        });

        results.byEmail = {
          count: totalByEmail,
          recent: attemptsByEmail,
        };
      }

      return results;
    } catch (error) {
      this.logger.error(`Error getting debug attempts:`, error);
      return { error: error.message };
    }
  }
}
