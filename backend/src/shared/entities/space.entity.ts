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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, IsDate, IsUrl, Length, Min, Max } from 'class-validator';
import { Community } from './community.entity';
import { User } from './user.entity';
import { SpaceMember } from './space-member.entity';

export enum SpaceType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
}

export enum SpaceStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum SpaceInteractionType {
  POST = 'post',           // Feed-style posts (announcements, news)
  CHAT = 'chat',           // Real-time chat/messaging
  FORUM = 'forum',         // Threaded discussions
  FEED = 'feed',           // Social media style feed
}

export enum SpaceCategory {
  GENERAL = 'general',
  ANNOUNCEMENTS = 'announcements',
  DISCUSSION = 'discussion',
  PROJECTS = 'projects',
  SUPPORT = 'support',
  SOCIAL = 'social',
  GAMING = 'gaming',
  TECH = 'tech',
  CREATIVE = 'creative',
  EDUCATION = 'education',
  BUSINESS = 'business',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  NEWS = 'news',
  OTHER = 'other',
}

@Entity('spaces')
@Index(['communityId', 'type'])
@Index(['ownerId'])
@Index(['status'])
@Index(['category'])
@Index(['createdAt'])
export class Space {
  @ApiProperty({ description: 'Space ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Space name' })
  @Column({ length: 100 })
  @IsString()
  @Length(1, 100, { message: 'Space name must be 1-100 characters' })
  name: string;

  @ApiPropertyOptional({ description: 'Space description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @ApiProperty({ description: 'Community ID that owns this space' })
  @Column({ name: 'community_id' })
  communityId: string;

  @ApiProperty({ description: 'Space owner ID' })
  @Column({ name: 'owner_id' })
  ownerId: string;

  @ApiProperty({ description: 'Space type', enum: SpaceType })
  @Column({
    type: 'enum',
    enum: SpaceType,
    default: SpaceType.PUBLIC,
  })
  @IsEnum(SpaceType, { message: 'Invalid space type' })
  type: SpaceType;

  @ApiProperty({ description: 'Space interaction type', enum: SpaceInteractionType })
  @Column({
    type: 'enum',
    enum: SpaceInteractionType,
    default: SpaceInteractionType.CHAT,
  })
  @IsEnum(SpaceInteractionType, { message: 'Invalid space interaction type' })
  interactionType: SpaceInteractionType;

  @ApiProperty({ description: 'Space status', enum: SpaceStatus })
  @Column({
    type: 'enum',
    enum: SpaceStatus,
    default: SpaceStatus.ACTIVE,
  })
  @IsEnum(SpaceStatus, { message: 'Invalid space status' })
  status: SpaceStatus;

  @ApiProperty({ description: 'Space category', enum: SpaceCategory })
  @Column({
    type: 'enum',
    enum: SpaceCategory,
    default: SpaceCategory.GENERAL,
  })
  @IsEnum(SpaceCategory, { message: 'Invalid space category' })
  category: SpaceCategory;

  @ApiPropertyOptional({ description: 'Space avatar/icon URL' })
  @Column({ name: 'avatar_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Space banner image URL' })
  @Column({ name: 'banner_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Banner URL must be a valid URL' })
  bannerUrl?: string;

  // Space Settings & Configuration
  @ApiPropertyOptional({ description: 'Allow invites to space' })
  @Column({ default: true })
  @IsBoolean()
  allowInvites: boolean;

  @ApiPropertyOptional({ description: 'Allow members to invite others' })
  @Column({ default: false })
  @IsBoolean()
  allowMemberInvites: boolean;

  @ApiPropertyOptional({ description: 'Require approval to join' })
  @Column({ default: false })
  @IsBoolean()
  requireApproval: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of members' })
  @Column({ default: 1000 })
  @IsNumber({}, { message: 'Max members must be a number' })
  @Min(1, { message: 'Max members must be at least 1' })
  @Max(10000, { message: 'Max members cannot exceed 10,000' })
  maxMembers: number;

  @ApiPropertyOptional({ description: 'Allow file uploads' })
  @Column({ default: true })
  @IsBoolean()
  allowFileUploads: boolean;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @Column({ default: 25 * 1024 * 1024 }) // 25MB
  @IsNumber({}, { message: 'Max file size must be a number' })
  maxFileSize: number;

  @ApiPropertyOptional({ description: 'Allow external links' })
  @Column({ default: true })
  @IsBoolean()
  allowExternalLinks: boolean;

  @ApiPropertyOptional({ description: 'Enable slow mode' })
  @Column({ default: false })
  @IsBoolean()
  enableSlowMode: boolean;

  @ApiPropertyOptional({ description: 'Slow mode delay in seconds' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Slow mode delay must be a number' })
  @Min(0, { message: 'Slow mode delay cannot be negative' })
  @Max(3600, { message: 'Slow mode delay cannot exceed 1 hour' })
  slowModeDelay: number;

  @ApiPropertyOptional({ description: 'Enable message threads' })
  @Column({ default: true })
  @IsBoolean()
  enableThreads: boolean;

  @ApiPropertyOptional({ description: 'Enable reactions' })
  @Column({ default: true })
  @IsBoolean()
  enableReactions: boolean;

  // Interaction Type Specific Settings
  @ApiPropertyOptional({ description: 'Allow only admins to post (for announcement-style spaces)' })
  @Column({ default: false })
  @IsBoolean()
  restrictPostingToAdmins: boolean;

  @ApiPropertyOptional({ description: 'Disable chat functionality (for post-only spaces)' })
  @Column({ default: false })
  @IsBoolean()
  disableChat: boolean;

  @ApiPropertyOptional({ description: 'Allow member interactions (comments, replies on posts)' })
  @Column({ default: true })
  @IsBoolean()
  allowMemberInteractions: boolean;

  // Moderation Settings
  @ApiPropertyOptional({ description: 'Enable automatic moderation' })
  @Column({ default: false })
  @IsBoolean()
  enableAutoModeration: boolean;

  @ApiPropertyOptional({ description: 'Require message approval for new members' })
  @Column({ default: false })
  @IsBoolean()
  requireApprovalForNewMembers: boolean;

  @ApiPropertyOptional({ description: 'List of banned words' })
  @Column('text', { array: true, default: [] })
  bannedWords: string[];

  @ApiPropertyOptional({ description: 'Auto-delete messages containing banned words' })
  @Column({ default: false })
  @IsBoolean()
  autoDeleteBannedWords: boolean;

  // Statistics & Metadata
  @ApiPropertyOptional({ description: 'Total number of members' })
  @Column({ default: 1 })
  @IsNumber({}, { message: 'Member count must be a number' })
  @Min(0, { message: 'Member count cannot be negative' })
  memberCount: number;

  @ApiPropertyOptional({ description: 'Total messages sent' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Message count must be a number' })
  @Min(0, { message: 'Message count cannot be negative' })
  messageCount: number;

  @ApiPropertyOptional({ description: 'Number of active members today' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Active members count must be a number' })
  @Min(0, { message: 'Active members count cannot be negative' })
  activeMembersToday: number;

  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  @Column({ name: 'last_activity_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastActivityAt?: Date;

  // SEO & Discovery
  @ApiPropertyOptional({ description: 'Space tags for discovery' })
  @Column('text', { array: true, default: [] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Space featured status' })
  @Column({ default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ApiPropertyOptional({ description: 'Space pinned in community' })
  @Column({ default: false })
  @IsBoolean()
  isPinned: boolean;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Send notifications for new messages' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnNewMessages: boolean;

  @ApiPropertyOptional({ description: 'Send notifications for new members' })
  @Column({ default: false })
  @IsBoolean()
  notifyOnNewMembers: boolean;

  @ApiPropertyOptional({ description: 'Send notifications for member activities' })
  @Column({ default: false })
  @IsBoolean()
  notifyOnMemberActivities: boolean;

  // Access Control
  @ApiPropertyOptional({ description: 'Required role to view space' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  requiredRoleToView?: string;

  @ApiPropertyOptional({ description: 'Required role to join space' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  requiredRoleToJoin?: string;

  @ApiPropertyOptional({ description: 'Required role to post messages' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  requiredRoleToPost?: string;

  // Additional Metadata
  @ApiPropertyOptional({ description: 'Space custom color theme' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiPropertyOptional({ description: 'Space welcome message' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 2000, { message: 'Welcome message cannot exceed 2000 characters' })
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Space rules and guidelines' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 5000, { message: 'Rules cannot exceed 5000 characters' })
  rules?: string;

  @ApiProperty({ description: 'Space settings in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Space metadata in JSON format' })
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
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => SpaceMember, (spaceMember) => spaceMember.space)
  members: SpaceMember[];

  // Helper Methods
  isPublic(): boolean {
    return this.type === SpaceType.PUBLIC;
  }

  isPrivate(): boolean {
    return this.type === SpaceType.PRIVATE;
  }

  isSecret(): boolean {
    return this.type === SpaceType.SECRET;
  }

  isActive(): boolean {
    return this.status === SpaceStatus.ACTIVE;
  }

  isArchivedStatus(): boolean {
    return this.status === SpaceStatus.ARCHIVED;
  }

  isSuspended(): boolean {
    return this.status === SpaceStatus.SUSPENDED;
  }

  canJoin(): boolean {
    return this.isActive() && !this.isArchivedStatus() && this.memberCount < this.maxMembers;
  }

  canPost(): boolean {
    return this.isActive() && !this.isArchivedStatus();
  }

  hasSlowMode(): boolean {
    return this.enableSlowMode && this.slowModeDelay > 0;
  }

  incrementMemberCount(): void {
    this.memberCount += 1;
    this.updateLastActivity();
  }

  decrementMemberCount(): void {
    if (this.memberCount > 0) {
      this.memberCount -= 1;
    }
  }

  incrementMessageCount(): void {
    this.messageCount += 1;
    this.updateLastActivity();
  }

  updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  archive(): void {
    this.status = SpaceStatus.ARCHIVED;
  }

  unarchive(): void {
    this.status = SpaceStatus.ACTIVE;
  }

  suspend(reason?: string): void {
    this.status = SpaceStatus.SUSPENDED;
    if (reason) {
      this.metadata.suspensionReason = reason;
    }
  }

  unsuspend(): void {
    this.status = SpaceStatus.ACTIVE;
    delete this.metadata.suspensionReason;
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag.toLowerCase())) {
      this.tags.push(tag.toLowerCase());
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  }

  addBannedWord(word: string): void {
    if (!this.bannedWords.includes(word.toLowerCase())) {
      this.bannedWords.push(word.toLowerCase());
    }
  }

  removeBannedWord(word: string): void {
    this.bannedWords = this.bannedWords.filter(w => w !== word.toLowerCase());
  }

  containsBannedWord(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.bannedWords.some(word => lowerText.includes(word));
  }

  pin(): void {
    this.isPinned = true;
  }

  unpin(): void {
    this.isPinned = false;
  }

  feature(): void {
    this.isFeatured = true;
  }

  unfeature(): void {
    this.isFeatured = false;
  }

  enableSlowModeWithDelay(delaySeconds: number): void {
    this.enableSlowMode = true;
    this.slowModeDelay = Math.max(0, Math.min(3600, delaySeconds));
  }

  disableSlowMode(): void {
    this.enableSlowMode = false;
    this.slowModeDelay = 0;
  }

  setMaxMembers(max: number): void {
    this.maxMembers = Math.max(1, Math.min(10000, max));
  }

  setMaxFileSize(sizeInBytes: number): void {
    this.maxFileSize = Math.max(0, sizeInBytes);
  }

  changeType(newType: SpaceType): void {
    this.type = newType;
  }

  changeCategory(newCategory: SpaceCategory): void {
    this.category = newCategory;
  }

  updateWelcomeMessage(message: string): void {
    this.welcomeMessage = message.substring(0, 2000);
  }

  updateRules(rules: string): void {
    this.rules = rules.substring(0, 5000);
  }

  isAtCapacity(): boolean {
    return this.memberCount >= this.maxMembers;
  }

  getCapacityPercentage(): number {
    return Math.round((this.memberCount / this.maxMembers) * 100);
  }

  isNearCapacity(threshold: number = 90): boolean {
    return this.getCapacityPercentage() >= threshold;
  }
}
