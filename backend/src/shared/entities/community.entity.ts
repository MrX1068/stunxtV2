import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsUrl, IsEnum, Length, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { CommunityMember } from './community-member.entity';
import { Space } from './space.entity';

export enum CommunityType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
}

export enum CommunityInteractionType {
  POST = 'post',        // Feed-style posts with reactions
  CHAT = 'chat',        // Chat-style real-time messaging
  HYBRID = 'hybrid',    // Both posts and chat
}

export enum CommunityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum CommunityVerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  PARTNER = 'partner',
}

export enum JoinRequirement {
  OPEN = 'open',
  APPROVAL_REQUIRED = 'approval_required',
  INVITE_ONLY = 'invite_only',
}

@Entity('communities')
@Index(['name'])
@Index(['type'])
@Index(['status'])
@Index(['ownerId'])
export class Community {
  @ApiProperty({ description: 'Unique identifier for the community' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community name' })
  @Column({ length: 100 })
  @IsNotEmpty({ message: 'Community name is required' })
  @Length(3, 100, { message: 'Community name must be between 3 and 100 characters' })
  name: string;

  @ApiProperty({ description: 'Community URL slug' })
  @Column({ unique: true, length: 50 })
  @IsNotEmpty({ message: 'Community slug is required' })
  @Length(3, 50, { message: 'Community slug must be between 3 and 50 characters' })
  slug: string;

  @ApiPropertyOptional({ description: 'Community description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @ApiPropertyOptional({ description: 'Community cover image URL' })
  @Column({ name: 'cover_image_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid cover image URL' })
  coverImageUrl: string;

  @ApiPropertyOptional({ description: 'Community avatar URL' })
  @Column({ name: 'avatar_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid avatar URL' })
  avatarUrl: string;

  @ApiProperty({ description: 'Community type', enum: CommunityType })
  @Column({
    type: 'enum',
    enum: CommunityType,
    default: CommunityType.PUBLIC,
  })
  @IsEnum(CommunityType, { message: 'Invalid community type' })
  type: CommunityType;

  @ApiProperty({ description: 'Community interaction type', enum: CommunityInteractionType })
  @Column({
    type: 'enum',
    enum: CommunityInteractionType,
    default: CommunityInteractionType.HYBRID,
  })
  @IsEnum(CommunityInteractionType, { message: 'Invalid community interaction type' })
  interactionType: CommunityInteractionType;

  @ApiProperty({ description: 'Community status', enum: CommunityStatus })
  @Column({
    type: 'enum',
    enum: CommunityStatus,
    default: CommunityStatus.ACTIVE,
  })
  @IsEnum(CommunityStatus, { message: 'Invalid community status' })
  status: CommunityStatus;

  @ApiProperty({ description: 'Join requirement', enum: JoinRequirement })
  @Column({
    type: 'enum',
    enum: JoinRequirement,
    default: JoinRequirement.OPEN,
  })
  @IsEnum(JoinRequirement, { message: 'Invalid join requirement' })
  joinRequirement: JoinRequirement;

  @ApiProperty({ description: 'Verification status', enum: CommunityVerificationStatus })
  @Column({
    type: 'enum',
    enum: CommunityVerificationStatus,
    default: CommunityVerificationStatus.UNVERIFIED,
  })
  @IsEnum(CommunityVerificationStatus, { message: 'Invalid verification status' })
  verificationStatus: CommunityVerificationStatus;

  @ApiProperty({ description: 'Community owner ID' })
  @Column({ name: 'owner_id' })
  ownerId: string;

  // Community Settings & Configuration
  @ApiPropertyOptional({ description: 'Allow invites to community' })
  @Column({ default: true })
  allowInvites: boolean;

  @ApiPropertyOptional({ description: 'Allow members to create invites' })
  @Column({ default: true })
  allowMemberInvites: boolean;

  @ApiPropertyOptional({ description: 'Require email verification to join' })
  @Column({ default: false })
  requireEmailVerification: boolean;

  @ApiPropertyOptional({ description: 'Minimum age to join' })
  @Column({ default: 13 })
  @IsNumber({}, { message: 'Minimum age must be a number' })
  @Min(13, { message: 'Minimum age cannot be less than 13' })
  @Max(99, { message: 'Minimum age cannot be more than 99' })
  minimumAge: number;

  @ApiPropertyOptional({ description: 'Maximum number of members' })
  @Column({ default: 100000 })
  @IsNumber({}, { message: 'Max members must be a number' })
  @Min(1, { message: 'Max members must be at least 1' })
  @Max(1000000, { message: 'Max members cannot exceed 1,000,000' })
  maxMembers: number;

  @ApiPropertyOptional({ description: 'Allow members to create spaces' })
  @Column({ default: true })
  allowSpaceCreation: boolean;

  @ApiPropertyOptional({ description: 'Allow file uploads' })
  @Column({ default: true })
  allowFileUploads: boolean;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @Column({ default: 50 * 1024 * 1024 }) // 50MB
  maxFileSize: number;

  // Moderation Settings
  @ApiPropertyOptional({ description: 'Enable slow mode' })
  @Column({ default: false })
  enableSlowMode: boolean;

  @ApiPropertyOptional({ description: 'Slow mode delay in seconds' })
  @Column({ default: 0 })
  slowModeDelay: number;

  @ApiPropertyOptional({ description: 'Enable automatic word filtering' })
  @Column({ default: true })
  enableWordFilter: boolean;

  @ApiPropertyOptional({ description: 'List of banned words' })
  @Column('text', { array: true, default: [] })
  bannedWords: string[];

  @ApiPropertyOptional({ description: 'Require message approval' })
  @Column({ default: false })
  requireMessageApproval: boolean;

  @ApiPropertyOptional({ description: 'Enable raid protection' })
  @Column({ default: false })
  enableRaidProtection: boolean;

  // Statistics & Enhanced Metadata
  @ApiPropertyOptional({ description: 'Total number of spaces' })
  @Column({ default: 0 })
  spaceCount: number;

  @ApiPropertyOptional({ description: 'Number of active members today' })
  @Column({ default: 0 })
  activeMembersToday: number;

  @ApiPropertyOptional({ description: 'Total messages sent' })
  @Column({ default: 0 })
  messageCount: number;

  // SEO & Discovery
  @ApiPropertyOptional({ description: 'SEO keywords for discovery' })
  @Column('text', { array: true, default: [] })
  keywords: string[];

  @ApiPropertyOptional({ description: 'Community featured status' })
  @Column({ default: false })
  isFeatured: boolean;

  @ApiPropertyOptional({ description: 'Community trending status' })
  @Column({ default: false })
  isTrending: boolean;

  @ApiPropertyOptional({ description: 'Community verified by platform' })
  @Column({ default: false })
  isPlatformVerified: boolean;

  // External Links
  @ApiPropertyOptional({ description: 'Community website URL' })
  @Column({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Community Discord server URL' })
  @Column({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Discord URL must be a valid URL' })
  discordUrl?: string;

  @ApiPropertyOptional({ description: 'Community Twitter handle' })
  @Column({ nullable: true })
  @IsOptional()
  @Length(1, 15, { message: 'Twitter handle must be 1-15 characters' })
  twitterHandle?: string;

  @ApiPropertyOptional({ description: 'Community GitHub organization' })
  @Column({ nullable: true })
  @IsOptional()
  @Length(1, 39, { message: 'GitHub organization must be 1-39 characters' })
  githubOrg?: string;

  @ApiProperty({ description: 'Member count' })
  @Column({ name: 'member_count', default: 1 })
  memberCount: number;

  @ApiProperty({ description: 'Community settings in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Community metadata in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
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
  @ManyToOne(() => User, (user) => user.ownedCommunities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => CommunityMember, (member) => member.community, {
    cascade: true,
  })
  members: CommunityMember[];

  @OneToMany(() => Space, (space) => space.community, {
    cascade: true,
  })
  spaces: Space[];

  // Helper methods
  isActive(): boolean {
    return this.status === CommunityStatus.ACTIVE;
  }

  isPublic(): boolean {
    return this.type === CommunityType.PUBLIC;
  }

  isPrivate(): boolean {
    return this.type === CommunityType.PRIVATE;
  }

  isSecret(): boolean {
    return this.type === CommunityType.SECRET;
  }

  canJoin(): boolean {
    return this.isActive() && this.isPublic();
  }

  incrementMemberCount(): void {
    this.memberCount += 1;
  }

  decrementMemberCount(): void {
    if (this.memberCount > 0) {
      this.memberCount -= 1;
    }
  }

  incrementMessageCount(): void {
    this.messageCount += 1;
  }

  decrementMessageCount(): void {
    if (this.messageCount > 0) {
      this.messageCount -= 1;
    }
  }
}
