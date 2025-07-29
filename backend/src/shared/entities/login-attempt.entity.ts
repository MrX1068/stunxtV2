import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsEnum, IsUUID, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

export enum AttemptResult {
  SUCCESS = 'success',
  FAILED_PASSWORD = 'failed_password',
  FAILED_USER_NOT_FOUND = 'failed_user_not_found',
  FAILED_ACCOUNT_LOCKED = 'failed_account_locked',
  FAILED_ACCOUNT_DISABLED = 'failed_account_disabled',
  FAILED_2FA = 'failed_2fa',
  FAILED_RATE_LIMIT = 'failed_rate_limit',
  FAILED_SUSPICIOUS = 'failed_suspicious',
}

export enum AttemptType {
  LOGIN = 'login',
  REGISTRATION = 'registration',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  TWO_FACTOR = 'two_factor',
  REFRESH_TOKEN = 'refresh_token',
}

@Entity('login_attempts')
@Index(['userId'])
@Index(['email'])
@Index(['ipAddress'])
@Index(['result'])
@Index(['type'])
@Index(['suspicious'])
export class LoginAttempt {
  @ApiProperty({ description: 'Unique identifier for the login attempt' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ description: 'User ID (if user exists)' })
  @Column({ name: 'user_id', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({ description: 'Email address used in attempt' })
  @Column({ length: 255 })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ description: 'Attempt type', enum: AttemptType })
  @Column({
    type: 'enum',
    enum: AttemptType,
    default: AttemptType.LOGIN,
  })
  @IsEnum(AttemptType, { message: 'Invalid attempt type' })
  type: AttemptType;

  @ApiProperty({ description: 'Attempt result', enum: AttemptResult })
  @Column({
    type: 'enum',
    enum: AttemptResult,
  })
  @IsEnum(AttemptResult, { message: 'Invalid attempt result' })
  result: AttemptResult;

  @ApiPropertyOptional({ description: 'IP address' })
  @Column({ name: 'ip_address', length: 45, nullable: true })
  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address' })
  ipAddress: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  userAgent: string;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  @Column({ name: 'device_fingerprint', length: 255, nullable: true })
  @IsOptional()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  @Column({ name: 'location_info', type: 'jsonb', default: {} })
  locationInfo: Record<string, any>;

  @ApiProperty({ description: 'Whether attempt is suspicious' })
  @Column({ default: false })
  suspicious: boolean;

  @ApiProperty({ description: 'Suspicion score (0-100)' })
  @Column({ name: 'suspicion_score', default: 0 })
  suspicionScore: number;

  @ApiPropertyOptional({ description: 'Failure reason details' })
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  @IsOptional()
  failureReason: string;

  @ApiPropertyOptional({ description: 'Session ID if successful' })
  @Column({ name: 'session_id', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Session ID must be a valid UUID' })
  sessionId: string;

  @ApiProperty({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.loginAttempts, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isSuccessful(): boolean {
    return this.result === AttemptResult.SUCCESS;
  }

  isFailed(): boolean {
    return this.result !== AttemptResult.SUCCESS;
  }

  isPasswordFailure(): boolean {
    return this.result === AttemptResult.FAILED_PASSWORD;
  }

  isUserNotFound(): boolean {
    return this.result === AttemptResult.FAILED_USER_NOT_FOUND;
  }

  isAccountLocked(): boolean {
    return this.result === AttemptResult.FAILED_ACCOUNT_LOCKED;
  }

  isAccountDisabled(): boolean {
    return this.result === AttemptResult.FAILED_ACCOUNT_DISABLED;
  }

  is2FAFailure(): boolean {
    return this.result === AttemptResult.FAILED_2FA;
  }

  isRateLimited(): boolean {
    return this.result === AttemptResult.FAILED_RATE_LIMIT;
  }

  isSuspicious(): boolean {
    return this.suspicious || this.suspicionScore > 50;
  }

  isHighRisk(): boolean {
    return this.suspicionScore > 80;
  }

  isLoginAttempt(): boolean {
    return this.type === AttemptType.LOGIN;
  }

  isPasswordReset(): boolean {
    return this.type === AttemptType.PASSWORD_RESET;
  }

  isEmailVerification(): boolean {
    return this.type === AttemptType.EMAIL_VERIFICATION;
  }

  is2FAAttempt(): boolean {
    return this.type === AttemptType.TWO_FACTOR;
  }

  isRefreshToken(): boolean {
    return this.type === AttemptType.REFRESH_TOKEN;
  }

  markAsSuspicious(reason: string, score: number = 75): void {
    this.suspicious = true;
    this.suspicionScore = Math.max(this.suspicionScore, score);
    this.failureReason = reason;
  }

  getLocationString(): string {
    if (this.locationInfo?.city && this.locationInfo?.country) {
      return `${this.locationInfo.city}, ${this.locationInfo.country}`;
    }
    
    if (this.locationInfo?.country) {
      return this.locationInfo.country;
    }
    
    return 'Unknown Location';
  }

  getDeviceInfo(): string {
    if (this.userAgent) {
      // Extract basic device info from user agent
      const mobile = /Mobile|Android|iPhone|iPad/i.test(this.userAgent);
      const tablet = /iPad|Tablet/i.test(this.userAgent);
      const desktop = !mobile && !tablet;
      
      if (mobile) return 'Mobile Device';
      if (tablet) return 'Tablet Device';
      if (desktop) return 'Desktop Browser';
    }
    
    return 'Unknown Device';
  }

  calculateSuspicionScore(): number {
    let score = 0;
    
    // Multiple failed attempts increase suspicion
    if (this.isFailed()) {
      score += 20;
    }
    
    // Password failures are less suspicious than other failures
    if (this.isPasswordFailure()) {
      score += 10;
    } else if (this.isFailed()) {
      score += 30;
    }
    
    // Account locked attempts are highly suspicious
    if (this.isAccountLocked()) {
      score += 40;
    }
    
    // Unknown location increases suspicion
    if (!this.locationInfo?.country) {
      score += 15;
    }
    
    // No user agent is suspicious
    if (!this.userAgent) {
      score += 25;
    }
    
    return Math.min(score, 100);
  }

  shouldTriggerAlert(): boolean {
    return this.isSuspicious() && (
      this.isHighRisk() ||
      this.isAccountLocked() ||
      this.isRateLimited()
    );
  }
}
