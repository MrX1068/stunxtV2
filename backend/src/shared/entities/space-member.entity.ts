import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, IsDate, Min, Max } from 'class-validator';
import { Space } from './space.entity';
import { User } from './user.entity';

export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum SpaceMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  LEFT = 'left',
  KICKED = 'kicked',
}

export enum SpacePermission {
  // Message Permissions
  SEND_MESSAGES = 'send_messages',
  EDIT_MESSAGES = 'edit_messages',
  DELETE_MESSAGES = 'delete_messages',
  DELETE_ANY_MESSAGE = 'delete_any_message',
  PIN_MESSAGES = 'pin_messages',
  
  // Thread Permissions
  CREATE_THREADS = 'create_threads',
  MANAGE_THREADS = 'manage_threads',
  
  // Member Permissions
  INVITE_MEMBERS = 'invite_members',
  KICK_MEMBERS = 'kick_members',
  BAN_MEMBERS = 'ban_members',
  MANAGE_MEMBERS = 'manage_members',
  VIEW_MEMBER_LIST = 'view_member_list',
  
  // Space Management
  EDIT_SPACE = 'edit_space',
  DELETE_SPACE = 'delete_space',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_SETTINGS = 'manage_settings',
  
  // File & Media
  UPLOAD_FILES = 'upload_files',
  UPLOAD_MEDIA = 'upload_media',
  EMBED_LINKS = 'embed_links',
  
  // Advanced Features
  ADD_REACTIONS = 'add_reactions',
  MENTION_EVERYONE = 'mention_everyone',
  USE_VOICE_CHAT = 'use_voice_chat',
  SCREEN_SHARE = 'screen_share',
}

@Entity('space_members')
@Unique(['spaceId', 'userId'])
@Index(['spaceId', 'role'])
@Index(['userId', 'status'])
@Index(['joinedAt'])
export class SpaceMember {
  @ApiProperty({ description: 'Space member ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Space ID' })
  @Column({ name: 'space_id' })
  spaceId: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Member role', enum: SpaceMemberRole })
  @Column({
    type: 'enum',
    enum: SpaceMemberRole,
    default: SpaceMemberRole.MEMBER,
  })
  @IsEnum(SpaceMemberRole, { message: 'Invalid member role' })
  role: SpaceMemberRole;

  @ApiProperty({ description: 'Member status', enum: SpaceMemberStatus })
  @Column({
    type: 'enum',
    enum: SpaceMemberStatus,
    default: SpaceMemberStatus.ACTIVE,
  })
  @IsEnum(SpaceMemberStatus, { message: 'Invalid member status' })
  status: SpaceMemberStatus;

  @ApiProperty({ description: 'Custom permissions for this member' })
  @Column('text', { array: true, default: [] })
  customPermissions: SpacePermission[];

  @ApiProperty({ description: 'Permissions denied for this member' })
  @Column('text', { array: true, default: [] })
  deniedPermissions: SpacePermission[];

  // Member Activity & Stats
  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  @Column({ name: 'last_activity_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastActivityAt?: Date;

  @ApiPropertyOptional({ description: 'Total messages sent in space' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Message count must be a number' })
  @Min(0, { message: 'Message count cannot be negative' })
  messageCount: number;

  @ApiPropertyOptional({ description: 'Total threads created' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Thread count must be a number' })
  @Min(0, { message: 'Thread count cannot be negative' })
  threadCount: number;

  @ApiPropertyOptional({ description: 'Total files uploaded' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'File count must be a number' })
  @Min(0, { message: 'File count cannot be negative' })
  fileCount: number;

  @ApiPropertyOptional({ description: 'Total reactions given' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Reaction count must be a number' })
  @Min(0, { message: 'Reaction count cannot be negative' })
  reactionCount: number;

  @ApiPropertyOptional({ description: 'Member reputation in space' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Reputation must be a number' })
  reputation: number;

  // Moderation & Restrictions
  @ApiPropertyOptional({ description: 'Whether member is muted' })
  @Column({ default: false })
  @IsBoolean()
  isMuted: boolean;

  @ApiPropertyOptional({ description: 'Mute expiration timestamp' })
  @Column({ name: 'muted_until', nullable: true })
  @IsOptional()
  @IsDate()
  mutedUntil?: Date;

  @ApiPropertyOptional({ description: 'Reason for current restriction' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  restrictionReason?: string;

  @ApiPropertyOptional({ description: 'Number of warnings received' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Warning count must be a number' })
  @Min(0, { message: 'Warning count cannot be negative' })
  @Max(50, { message: 'Warning count cannot exceed 50' })
  warningCount: number;

  // Join & Leave Information
  @ApiProperty({ description: 'When member joined the space' })
  @Column({ name: 'joined_at' })
  @IsDate()
  joinedAt: Date;

  @ApiPropertyOptional({ description: 'When member left the space' })
  @Column({ name: 'left_at', nullable: true })
  @IsOptional()
  @IsDate()
  leftAt?: Date;

  @ApiPropertyOptional({ description: 'Who invited this member' })
  @Column({ name: 'invited_by', nullable: true })
  @IsOptional()
  @IsString()
  invitedBy?: string;

  @ApiPropertyOptional({ description: 'Join method (invite, application, direct)' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  joinMethod?: string;

  // Customization
  @ApiPropertyOptional({ description: 'Member nickname in space' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Custom member color' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Member status message' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  statusMessage?: string;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Receive message notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnMessages: boolean;

  @ApiPropertyOptional({ description: 'Receive mention notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnMentions: boolean;

  @ApiPropertyOptional({ description: 'Receive thread notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnThreads: boolean;

  @ApiPropertyOptional({ description: 'Receive file upload notifications' })
  @Column({ default: false })
  @IsBoolean()
  notifyOnFileUploads: boolean;

  // Additional Metadata
  @ApiProperty({ description: 'Member settings in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Member metadata in JSON format' })
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
  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper Methods
  hasPermission(permission: SpacePermission): boolean {
    // Check if permission is explicitly denied
    if (this.deniedPermissions.includes(permission)) {
      return false;
    }

    // Check if permission is explicitly granted
    if (this.customPermissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    return this.getRolePermissions().includes(permission);
  }

  getRolePermissions(): SpacePermission[] {
    switch (this.role) {
      case SpaceMemberRole.OWNER:
        return Object.values(SpacePermission);
      
      case SpaceMemberRole.ADMIN:
        return [
          SpacePermission.SEND_MESSAGES,
          SpacePermission.EDIT_MESSAGES,
          SpacePermission.DELETE_MESSAGES,
          SpacePermission.DELETE_ANY_MESSAGE,
          SpacePermission.PIN_MESSAGES,
          SpacePermission.CREATE_THREADS,
          SpacePermission.MANAGE_THREADS,
          SpacePermission.INVITE_MEMBERS,
          SpacePermission.KICK_MEMBERS,
          SpacePermission.BAN_MEMBERS,
          SpacePermission.MANAGE_MEMBERS,
          SpacePermission.VIEW_MEMBER_LIST,
          SpacePermission.EDIT_SPACE,
          SpacePermission.MANAGE_ROLES,
          SpacePermission.MANAGE_SETTINGS,
          SpacePermission.UPLOAD_FILES,
          SpacePermission.UPLOAD_MEDIA,
          SpacePermission.EMBED_LINKS,
          SpacePermission.ADD_REACTIONS,
          SpacePermission.MENTION_EVERYONE,
          SpacePermission.USE_VOICE_CHAT,
          SpacePermission.SCREEN_SHARE,
        ];
      
      case SpaceMemberRole.MODERATOR:
        return [
          SpacePermission.SEND_MESSAGES,
          SpacePermission.EDIT_MESSAGES,
          SpacePermission.DELETE_MESSAGES,
          SpacePermission.DELETE_ANY_MESSAGE,
          SpacePermission.PIN_MESSAGES,
          SpacePermission.CREATE_THREADS,
          SpacePermission.MANAGE_THREADS,
          SpacePermission.INVITE_MEMBERS,
          SpacePermission.KICK_MEMBERS,
          SpacePermission.VIEW_MEMBER_LIST,
          SpacePermission.UPLOAD_FILES,
          SpacePermission.UPLOAD_MEDIA,
          SpacePermission.EMBED_LINKS,
          SpacePermission.ADD_REACTIONS,
          SpacePermission.USE_VOICE_CHAT,
          SpacePermission.SCREEN_SHARE,
        ];
      
      case SpaceMemberRole.MEMBER:
        return [
          SpacePermission.SEND_MESSAGES,
          SpacePermission.EDIT_MESSAGES,
          SpacePermission.DELETE_MESSAGES,
          SpacePermission.CREATE_THREADS,
          SpacePermission.VIEW_MEMBER_LIST,
          SpacePermission.UPLOAD_FILES,
          SpacePermission.UPLOAD_MEDIA,
          SpacePermission.EMBED_LINKS,
          SpacePermission.ADD_REACTIONS,
          SpacePermission.USE_VOICE_CHAT,
        ];
      
      case SpaceMemberRole.GUEST:
        return [
          SpacePermission.SEND_MESSAGES,
          SpacePermission.EDIT_MESSAGES,
          SpacePermission.DELETE_MESSAGES,
          SpacePermission.VIEW_MEMBER_LIST,
          SpacePermission.ADD_REACTIONS,
        ];
      
      default:
        return [];
    }
  }

  canPromoteTo(targetRole: SpaceMemberRole): boolean {
    const roleHierarchy = {
      [SpaceMemberRole.GUEST]: 0,
      [SpaceMemberRole.MEMBER]: 1,
      [SpaceMemberRole.MODERATOR]: 2,
      [SpaceMemberRole.ADMIN]: 3,
      [SpaceMemberRole.OWNER]: 4,
    };

    return roleHierarchy[targetRole] > roleHierarchy[this.role];
  }

  canDemoteTo(targetRole: SpaceMemberRole): boolean {
    const roleHierarchy = {
      [SpaceMemberRole.GUEST]: 0,
      [SpaceMemberRole.MEMBER]: 1,
      [SpaceMemberRole.MODERATOR]: 2,
      [SpaceMemberRole.ADMIN]: 3,
      [SpaceMemberRole.OWNER]: 4,
    };

    return roleHierarchy[targetRole] < roleHierarchy[this.role];
  }

  isMutedNow(): boolean {
    if (!this.isMuted) return false;
    if (!this.mutedUntil) return true;
    return new Date() < this.mutedUntil;
  }

  incrementMessageCount(): void {
    this.messageCount += 1;
    this.lastActivityAt = new Date();
  }

  incrementThreadCount(): void {
    this.threadCount += 1;
  }

  incrementFileCount(): void {
    this.fileCount += 1;
  }

  incrementReactionCount(): void {
    this.reactionCount += 1;
  }

  addWarning(): void {
    this.warningCount += 1;
  }

  clearWarnings(): void {
    this.warningCount = 0;
  }

  muteUntil(until: Date, reason?: string): void {
    this.isMuted = true;
    this.mutedUntil = until;
    if (reason) {
      this.restrictionReason = reason;
    }
  }

  unmute(): void {
    this.isMuted = false;
    this.mutedUntil = null;
    this.restrictionReason = null;
  }

  updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  isActive(): boolean {
    return this.status === SpaceMemberStatus.ACTIVE;
  }

  isBanned(): boolean {
    return this.status === SpaceMemberStatus.BANNED;
  }

  hasLeft(): boolean {
    return this.status === SpaceMemberStatus.LEFT;
  }

  canParticipate(): boolean {
    return this.isActive() && !this.isMutedNow();
  }

  isOwner(): boolean {
    return this.role === SpaceMemberRole.OWNER;
  }

  isAdmin(): boolean {
    return this.role === SpaceMemberRole.ADMIN || this.isOwner();
  }

  isModerator(): boolean {
    return this.role === SpaceMemberRole.MODERATOR || this.isAdmin();
  }

  canManageMembers(): boolean {
    return this.hasPermission(SpacePermission.MANAGE_MEMBERS);
  }

  canManageRoles(): boolean {
    return this.hasPermission(SpacePermission.MANAGE_ROLES);
  }

  canManageThreads(): boolean {
    return this.hasPermission(SpacePermission.MANAGE_THREADS);
  }

  canUploadFiles(): boolean {
    return this.hasPermission(SpacePermission.UPLOAD_FILES);
  }

  canUseVoiceChat(): boolean {
    return this.hasPermission(SpacePermission.USE_VOICE_CHAT);
  }

  canScreenShare(): boolean {
    return this.hasPermission(SpacePermission.SCREEN_SHARE);
  }

  promoteToRole(newRole: SpaceMemberRole): void {
    if (this.canPromoteTo(newRole)) {
      this.role = newRole;
    }
  }

  demoteToRole(newRole: SpaceMemberRole): void {
    if (this.canDemoteTo(newRole)) {
      this.role = newRole;
    }
  }

  ban(reason?: string): void {
    this.status = SpaceMemberStatus.BANNED;
    this.leftAt = new Date();
    if (reason) {
      this.restrictionReason = reason;
    }
  }

  kick(reason?: string): void {
    this.status = SpaceMemberStatus.KICKED;
    this.leftAt = new Date();
    if (reason) {
      this.restrictionReason = reason;
    }
  }

  leave(): void {
    this.status = SpaceMemberStatus.LEFT;
    this.leftAt = new Date();
  }

  reactivate(): void {
    this.status = SpaceMemberStatus.ACTIVE;
    this.leftAt = null;
    this.restrictionReason = null;
  }

  setNickname(nickname: string): void {
    this.nickname = nickname.substring(0, 50);
  }

  setStatusMessage(message: string): void {
    this.statusMessage = message.substring(0, 100);
  }

  setColor(color: string): void {
    this.color = color;
  }
}
