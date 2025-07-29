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
import { Community } from './community.entity';
import { User } from './user.entity';

export enum CommunityMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  RESTRICTED = 'restricted',
}

export enum CommunityMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  LEFT = 'left',
  KICKED = 'kicked',
}

export enum CommunityPermission {
  // Message Permissions
  SEND_MESSAGES = 'send_messages',
  EDIT_MESSAGES = 'edit_messages',
  DELETE_MESSAGES = 'delete_messages',
  DELETE_ANY_MESSAGE = 'delete_any_message',
  PIN_MESSAGES = 'pin_messages',
  
  // Space Permissions
  CREATE_SPACES = 'create_spaces',
  EDIT_SPACES = 'edit_spaces',
  DELETE_SPACES = 'delete_spaces',
  MANAGE_SPACE_PERMISSIONS = 'manage_space_permissions',
  
  // Member Permissions
  INVITE_MEMBERS = 'invite_members',
  KICK_MEMBERS = 'kick_members',
  BAN_MEMBERS = 'ban_members',
  MANAGE_MEMBERS = 'manage_members',
  VIEW_MEMBER_LIST = 'view_member_list',
  
  // Community Management
  EDIT_COMMUNITY = 'edit_community',
  DELETE_COMMUNITY = 'delete_community',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOG = 'view_audit_log',
  
  // File & Media
  UPLOAD_FILES = 'upload_files',
  UPLOAD_MEDIA = 'upload_media',
  EMBED_LINKS = 'embed_links',
  
  // Advanced Features
  USE_SLASH_COMMANDS = 'use_slash_commands',
  MENTION_EVERYONE = 'mention_everyone',
  CREATE_EVENTS = 'create_events',
  MANAGE_EVENTS = 'manage_events',
}

@Entity('community_members')
@Unique(['communityId', 'userId'])
@Index(['communityId', 'role'])
@Index(['userId', 'status'])
@Index(['joinedAt'])
export class CommunityMember {
  @ApiProperty({ description: 'Community member ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community ID' })
  @Column({ name: 'community_id' })
  communityId: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Member role', enum: CommunityMemberRole })
  @Column({
    type: 'enum',
    enum: CommunityMemberRole,
    default: CommunityMemberRole.MEMBER,
  })
  @IsEnum(CommunityMemberRole, { message: 'Invalid member role' })
  role: CommunityMemberRole;

  @ApiProperty({ description: 'Member status', enum: CommunityMemberStatus })
  @Column({
    type: 'enum',
    enum: CommunityMemberStatus,
    default: CommunityMemberStatus.ACTIVE,
  })
  @IsEnum(CommunityMemberStatus, { message: 'Invalid member status' })
  status: CommunityMemberStatus;

  @ApiProperty({ description: 'Custom permissions for this member' })
  @Column('text', { array: true, default: [] })
  customPermissions: CommunityPermission[];

  @ApiProperty({ description: 'Permissions denied for this member' })
  @Column('text', { array: true, default: [] })
  deniedPermissions: CommunityPermission[];

  // Member Activity & Stats
  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  @Column({ name: 'last_activity_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastActivityAt?: Date;

  @ApiPropertyOptional({ description: 'Total messages sent' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Message count must be a number' })
  @Min(0, { message: 'Message count cannot be negative' })
  messageCount: number;

  @ApiPropertyOptional({ description: 'Total spaces created' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Space count must be a number' })
  @Min(0, { message: 'Space count cannot be negative' })
  spaceCount: number;

  @ApiPropertyOptional({ description: 'Total invites sent' })
  @Column({ default: 0 })
  @IsNumber({}, { message: 'Invite count must be a number' })
  @Min(0, { message: 'Invite count cannot be negative' })
  inviteCount: number;

  @ApiPropertyOptional({ description: 'Member reputation score' })
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
  @Max(100, { message: 'Warning count cannot exceed 100' })
  warningCount: number;

  // Join & Leave Information
  @ApiProperty({ description: 'When member joined the community' })
  @Column({ name: 'joined_at' })
  @IsDate()
  joinedAt: Date;

  @ApiPropertyOptional({ description: 'When member left the community' })
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

  @ApiPropertyOptional({ description: 'Member nickname in community' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Member bio/description in community' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Custom member color' })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Receive all message notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnMessages: boolean;

  @ApiPropertyOptional({ description: 'Receive mention notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnMentions: boolean;

  @ApiPropertyOptional({ description: 'Receive role change notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnRoleChanges: boolean;

  @ApiPropertyOptional({ description: 'Receive community event notifications' })
  @Column({ default: true })
  @IsBoolean()
  notifyOnEvents: boolean;

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
  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper Methods
  hasPermission(permission: CommunityPermission): boolean {
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

  getRolePermissions(): CommunityPermission[] {
    switch (this.role) {
      case CommunityMemberRole.OWNER:
        return Object.values(CommunityPermission);
      
      case CommunityMemberRole.ADMIN:
        return [
          CommunityPermission.SEND_MESSAGES,
          CommunityPermission.EDIT_MESSAGES,
          CommunityPermission.DELETE_MESSAGES,
          CommunityPermission.DELETE_ANY_MESSAGE,
          CommunityPermission.PIN_MESSAGES,
          CommunityPermission.CREATE_SPACES,
          CommunityPermission.EDIT_SPACES,
          CommunityPermission.DELETE_SPACES,
          CommunityPermission.MANAGE_SPACE_PERMISSIONS,
          CommunityPermission.INVITE_MEMBERS,
          CommunityPermission.KICK_MEMBERS,
          CommunityPermission.BAN_MEMBERS,
          CommunityPermission.MANAGE_MEMBERS,
          CommunityPermission.VIEW_MEMBER_LIST,
          CommunityPermission.EDIT_COMMUNITY,
          CommunityPermission.MANAGE_ROLES,
          CommunityPermission.MANAGE_SETTINGS,
          CommunityPermission.VIEW_AUDIT_LOG,
          CommunityPermission.UPLOAD_FILES,
          CommunityPermission.UPLOAD_MEDIA,
          CommunityPermission.EMBED_LINKS,
          CommunityPermission.USE_SLASH_COMMANDS,
          CommunityPermission.MENTION_EVERYONE,
          CommunityPermission.CREATE_EVENTS,
          CommunityPermission.MANAGE_EVENTS,
        ];
      
      case CommunityMemberRole.MODERATOR:
        return [
          CommunityPermission.SEND_MESSAGES,
          CommunityPermission.EDIT_MESSAGES,
          CommunityPermission.DELETE_MESSAGES,
          CommunityPermission.DELETE_ANY_MESSAGE,
          CommunityPermission.PIN_MESSAGES,
          CommunityPermission.CREATE_SPACES,
          CommunityPermission.EDIT_SPACES,
          CommunityPermission.INVITE_MEMBERS,
          CommunityPermission.KICK_MEMBERS,
          CommunityPermission.VIEW_MEMBER_LIST,
          CommunityPermission.UPLOAD_FILES,
          CommunityPermission.UPLOAD_MEDIA,
          CommunityPermission.EMBED_LINKS,
          CommunityPermission.USE_SLASH_COMMANDS,
          CommunityPermission.CREATE_EVENTS,
        ];
      
      case CommunityMemberRole.MEMBER:
        return [
          CommunityPermission.SEND_MESSAGES,
          CommunityPermission.EDIT_MESSAGES,
          CommunityPermission.DELETE_MESSAGES,
          CommunityPermission.INVITE_MEMBERS,
          CommunityPermission.VIEW_MEMBER_LIST,
          CommunityPermission.UPLOAD_FILES,
          CommunityPermission.UPLOAD_MEDIA,
          CommunityPermission.EMBED_LINKS,
          CommunityPermission.USE_SLASH_COMMANDS,
        ];
      
      case CommunityMemberRole.RESTRICTED:
        return [
          CommunityPermission.SEND_MESSAGES,
          CommunityPermission.EDIT_MESSAGES,
          CommunityPermission.DELETE_MESSAGES,
        ];
      
      default:
        return [];
    }
  }

  canPromoteTo(targetRole: CommunityMemberRole): boolean {
    const roleHierarchy = {
      [CommunityMemberRole.RESTRICTED]: 0,
      [CommunityMemberRole.MEMBER]: 1,
      [CommunityMemberRole.MODERATOR]: 2,
      [CommunityMemberRole.ADMIN]: 3,
      [CommunityMemberRole.OWNER]: 4,
    };

    return roleHierarchy[targetRole] > roleHierarchy[this.role];
  }

  canDemoteTo(targetRole: CommunityMemberRole): boolean {
    const roleHierarchy = {
      [CommunityMemberRole.RESTRICTED]: 0,
      [CommunityMemberRole.MEMBER]: 1,
      [CommunityMemberRole.MODERATOR]: 2,
      [CommunityMemberRole.ADMIN]: 3,
      [CommunityMemberRole.OWNER]: 4,
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

  incrementSpaceCount(): void {
    this.spaceCount += 1;
  }

  incrementInviteCount(): void {
    this.inviteCount += 1;
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
    return this.status === CommunityMemberStatus.ACTIVE;
  }

  isBanned(): boolean {
    return this.status === CommunityMemberStatus.BANNED;
  }

  hasLeft(): boolean {
    return this.status === CommunityMemberStatus.LEFT;
  }

  canParticipate(): boolean {
    return this.isActive() && !this.isMutedNow();
  }

  isOwner(): boolean {
    return this.role === CommunityMemberRole.OWNER;
  }

  isAdmin(): boolean {
    return this.role === CommunityMemberRole.ADMIN || this.isOwner();
  }

  isModerator(): boolean {
    return this.role === CommunityMemberRole.MODERATOR || this.isAdmin();
  }

  canManageMembers(): boolean {
    return this.hasPermission(CommunityPermission.MANAGE_MEMBERS);
  }

  canManageRoles(): boolean {
    return this.hasPermission(CommunityPermission.MANAGE_ROLES);
  }

  canCreateSpaces(): boolean {
    return this.hasPermission(CommunityPermission.CREATE_SPACES);
  }
}
