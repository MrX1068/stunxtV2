import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsUrl, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Community } from './community.entity';
import { Message } from './message.entity';
import { UserSession } from './user-session.entity';
import { LoginAttempt } from './login-attempt.entity';
import { CommunityMember } from './community-member.entity';
import { UserProfile } from './user-profile.entity';
import { UserPreferences } from './user-preferences.entity';
import { UserFollow } from './user-follow.entity';
import { UserBlock } from './user-block.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

@Entity('users')
@Index(['email'])
@Index(['username'])  
@Index(['status'])
export class User {
  @ApiProperty({ description: 'Unique identifier for the user' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User email address' })
  @Column({ unique: true, length: 255 })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ description: 'Unique username' })
  @Column({ unique: true, length: 50 })
  @IsNotEmpty({ message: 'Username is required' })
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  username: string;

  @ApiProperty({ description: 'User full name' })
  @Column({ name: 'full_name', length: 100 })
  @IsNotEmpty({ message: 'Full name is required' })
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName: string;

  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @Column({ name: 'avatar_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'User bio/description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 500, { message: 'Bio cannot exceed 500 characters' })
  bio: string;

  @ApiPropertyOptional({ description: 'User location' })
  @Column({ length: 100, nullable: true })
  @IsOptional()
  @Length(0, 100, { message: 'Location cannot exceed 100 characters' })
  location: string;

  @ApiPropertyOptional({ description: 'User website URL' })
  @Column({ name: 'website_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid website URL' })
  websiteUrl: string;

  @ApiProperty({ description: 'User status', enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status: UserStatus;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;

  @ApiProperty({ description: 'Authentication provider', enum: AuthProvider })
  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  @IsEnum(AuthProvider, { message: 'Invalid authentication provider' })
  authProvider: AuthProvider;

  @ApiPropertyOptional({ description: 'External provider ID' })
  @Column({ name: 'provider_id', nullable: true })
  providerId: string;

  @ApiProperty({ description: 'Whether email is verified' })
  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @ApiPropertyOptional({ description: 'Email verification token' })
  @Exclude()
  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @ApiPropertyOptional({ description: 'Password reset token' })
  @Exclude()
  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string;

  @ApiPropertyOptional({ description: 'Password reset token expiry' })
  @Exclude()
  @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
  passwordResetExpires: Date;

  @ApiProperty({ description: 'Two-factor authentication enabled' })
  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({ description: 'Two-factor authentication secret' })
  @Exclude()
  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  @ApiPropertyOptional({ description: 'Last login timestamp' })
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @ApiPropertyOptional({ description: 'Last active timestamp' })
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @ApiProperty({ description: 'Failed login attempts count' })
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @ApiPropertyOptional({ description: 'Account locked until timestamp' })
  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date;

  @ApiProperty({ description: 'User preferences in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @ApiProperty({ description: 'User metadata in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Record deletion timestamp (soft delete)' })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // Relationships
  @OneToMany(() => Community, (community) => community.owner, {
    cascade: true,
  })
  ownedCommunities: Community[];

  @OneToMany(() => CommunityMember, (member) => member.user, {
    cascade: true,
  })
  communityMemberships: CommunityMember[];

  @OneToMany(() => Message, (message) => message.sender, {
    cascade: true,
  })
  sentMessages: Message[];

  @OneToMany(() => UserSession, (session) => session.user, {
    cascade: true,
  })
  sessions: UserSession[];

  @OneToMany(() => LoginAttempt, (attempt) => attempt.user, {
    cascade: true,
  })
  loginAttempts: LoginAttempt[];

  // New relationships for User Management
  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
  })
  profile: UserProfile;

  @OneToOne(() => UserPreferences, (preferences) => preferences.user, {
    cascade: true,
    eager: true,
  })
  userPreferences: UserPreferences;

  @OneToMany(() => UserFollow, (follow) => follow.follower)
  following: UserFollow[];

  @OneToMany(() => UserFollow, (follow) => follow.following)
  followers: UserFollow[];

  @OneToMany(() => UserBlock, (block) => block.blocker)
  blocking: UserBlock[];

  @OneToMany(() => UserBlock, (block) => block.blocked)
  blockedBy: UserBlock[];

  // Helper methods
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  canLogin(): boolean {
    return this.isActive() && !this.isLocked();
  }

  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  isModerator(): boolean {
    return this.hasAnyRole([UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
    this.lastActiveAt = new Date();
    this.resetFailedAttempts();
  }
}
