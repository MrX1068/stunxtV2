import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsEnum, IsUUID, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

@Entity('user_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['deviceId'])
@Index(['expiresAt'])
@Index(['lastActivityAt'])
@Index(['refreshTokenExpiresAt']) // Added for refresh token queries
export class UserSession {
  @ApiProperty({ description: 'Unique identifier for the session' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({ description: 'Session token hash' })
  @Column({ name: 'token_hash', length: 255 })
  @IsNotEmpty({ message: 'Token hash is required' })
  tokenHash: string;

  @ApiPropertyOptional({ description: 'Refresh token hash (enterprise security)' })
  @Column({ name: 'refresh_token_hash', length: 255, nullable: true })
  @IsOptional()
  refreshTokenHash: string;

  @ApiPropertyOptional({ description: 'Refresh token expiration timestamp' })
  @Column({ name: 'refresh_token_expires_at', type: 'timestamp', nullable: true })
  @IsOptional()
  refreshTokenExpiresAt: Date;

  @ApiPropertyOptional({ description: 'Last token refresh timestamp' })
  @Column({ name: 'last_refreshed_at', type: 'timestamp', nullable: true })
  @IsOptional()
  lastRefreshedAt: Date;

  @ApiProperty({ description: 'Session status', enum: SessionStatus })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  @IsEnum(SessionStatus, { message: 'Invalid session status' })
  status: SessionStatus;

  @ApiPropertyOptional({ description: 'Device unique identifier' })
  @Column({ name: 'device_id', length: 255, nullable: true })
  @IsOptional()
  deviceId: string;

  @ApiProperty({ description: 'Device type', enum: DeviceType })
  @Column({
    name: 'device_type',
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
  })
  @IsEnum(DeviceType, { message: 'Invalid device type' })
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: 'Device name/model' })
  @Column({ name: 'device_name', length: 255, nullable: true })
  @IsOptional()
  deviceName: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @Column({ name: 'operating_system', length: 100, nullable: true })
  @IsOptional()
  operatingSystem: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @Column({ name: 'browser_name', length: 100, nullable: true })
  @IsOptional()
  browserName: string;

  @ApiPropertyOptional({ description: 'Browser version' })
  @Column({ name: 'browser_version', length: 50, nullable: true })
  @IsOptional()
  browserVersion: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @Column({ name: 'ip_address', length: 45, nullable: true })
  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address' })
  ipAddress: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  userAgent: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  @Column({ name: 'location_info', type: 'jsonb', default: {} })
  locationInfo: Record<string, any>;

  @ApiProperty({ description: 'Session expiration timestamp' })
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  @Column({ name: 'last_activity_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;

  @ApiPropertyOptional({ description: 'Session revoked timestamp' })
  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date;

  @ApiPropertyOptional({ description: 'Session revoked reason' })
  @Column({ name: 'revoked_reason', length: 255, nullable: true })
  revokedReason: string;

  @ApiProperty({ description: 'Push notification token' })
  @Column({ name: 'push_token', length: 255, nullable: true })
  @IsOptional()
  pushToken: string;

  @ApiProperty({ description: 'Session metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isRefreshTokenValid(): boolean {
    return this.refreshTokenHash && 
           this.refreshTokenExpiresAt && 
           this.refreshTokenExpiresAt > new Date();
  }

  isRevoked(): boolean {
    return this.status === SessionStatus.REVOKED;
  }

  isSuspended(): boolean {
    return this.status === SessionStatus.SUSPENDED;
  }

  canRefresh(): boolean {
    return this.isActive() && this.isRefreshTokenValid();
  }

  isMobile(): boolean {
    return this.deviceType === DeviceType.MOBILE;
  }

  isDesktop(): boolean {
    return this.deviceType === DeviceType.DESKTOP;
  }

  isWeb(): boolean {
    return this.deviceType === DeviceType.WEB;
  }

  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  extend(minutes: number = 60): void {
    if (this.isActive()) {
      this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
      this.updateActivity();
    }
  }

  expire(): void {
    this.status = SessionStatus.EXPIRED;
  }

  revoke(reason?: string): void {
    this.status = SessionStatus.REVOKED;
    this.revokedAt = new Date();
    this.revokedReason = reason || 'User action';
    // Clear refresh token on revocation
    this.refreshTokenHash = null;
    this.refreshTokenExpiresAt = null;
  }

  suspend(reason?: string): void {
    this.status = SessionStatus.SUSPENDED;
    this.revokedReason = reason || 'Security suspension';
  }

  reactivate(): void {
    if (this.isSuspended() && !this.isExpired()) {
      this.status = SessionStatus.ACTIVE;
      this.revokedReason = undefined;
    }
  }

  getDeviceInfo(): string {
    const parts = [];
    
    if (this.deviceName) {
      parts.push(this.deviceName);
    }
    
    if (this.operatingSystem) {
      parts.push(this.operatingSystem);
    }
    
    if (this.browserName && this.browserVersion) {
      parts.push(`${this.browserName} ${this.browserVersion}`);
    } else if (this.browserName) {
      parts.push(this.browserName);
    }
    
    return parts.join(' - ') || 'Unknown Device';
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

  isFromSameDevice(otherSession: UserSession): boolean {
    return this.deviceId === otherSession.deviceId && 
           this.deviceId !== null && 
           otherSession.deviceId !== null;
  }

  isFromSameLocation(otherSession: UserSession): boolean {
    return this.ipAddress === otherSession.ipAddress &&
           this.ipAddress !== null &&
           otherSession.ipAddress !== null;
  }
}
