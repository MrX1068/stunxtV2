import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { Community } from './community.entity';
import { User } from './user.entity';

export enum CommunityAuditAction {
  // Community Actions
  COMMUNITY_CREATED = 'community_created',
  COMMUNITY_UPDATED = 'community_updated',
  COMMUNITY_DELETED = 'community_deleted',
  COMMUNITY_SETTINGS_CHANGED = 'community_settings_changed',
  
  // Member Actions
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_KICKED = 'member_kicked',
  MEMBER_BANNED = 'member_banned',
  MEMBER_UNBANNED = 'member_unbanned',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  MEMBER_PERMISSIONS_CHANGED = 'member_permissions_changed',
  MEMBER_WARNED = 'member_warned',
  MEMBER_MUTED = 'member_muted',
  MEMBER_UNMUTED = 'member_unmuted',
  
  // Space Actions
  SPACE_CREATED = 'space_created',
  SPACE_UPDATED = 'space_updated',
  SPACE_DELETED = 'space_deleted',
  SPACE_ARCHIVED = 'space_archived',
  SPACE_UNARCHIVED = 'space_unarchived',
  SPACE_SETTINGS_CHANGED = 'space_settings_changed',
  
  // Space Member Actions
  SPACE_MEMBER_JOINED = 'space_member_joined',
  SPACE_MEMBER_LEFT = 'space_member_left',
  SPACE_MEMBER_KICKED = 'space_member_kicked',
  SPACE_MEMBER_BANNED = 'space_member_banned',
  SPACE_MEMBER_ROLE_CHANGED = 'space_member_role_changed',
  
  // Invite Actions
  INVITE_CREATED = 'invite_created',
  INVITE_ACCEPTED = 'invite_accepted',
  INVITE_DECLINED = 'invite_declined',
  INVITE_REVOKED = 'invite_revoked',
  INVITE_EXPIRED = 'invite_expired',
  
  // Message Actions
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_PINNED = 'message_pinned',
  MESSAGE_UNPINNED = 'message_unpinned',
  MESSAGE_EDITED = 'message_edited',
  
  // Moderation Actions
  AUTO_MODERATION_TRIGGERED = 'auto_moderation_triggered',
  BANNED_WORD_DETECTED = 'banned_word_detected',
  SPAM_DETECTED = 'spam_detected',
  RAID_PROTECTION_TRIGGERED = 'raid_protection_triggered',
  
  // Administrative Actions
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  
  // Security Actions
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  LOGIN_ATTEMPT_FAILED = 'login_attempt_failed',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_CHANGED = 'password_changed',
}

export enum CommunityAuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('community_audit_logs')
@Index(['communityId', 'action'])
@Index(['performedBy'])
@Index(['targetId', 'targetType'])
@Index(['severity'])
@Index(['createdAt'])
export class CommunityAuditLog {
  @ApiProperty({ description: 'Audit log ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community ID' })
  @Column({ name: 'community_id' })
  communityId: string;

  @ApiProperty({ description: 'Action performed', enum: CommunityAuditAction })
  @Column({
    type: 'enum',
    enum: CommunityAuditAction,
  })
  @IsEnum(CommunityAuditAction, { message: 'Invalid audit action' })
  action: CommunityAuditAction;

  @ApiProperty({ description: 'Severity level', enum: CommunityAuditSeverity })
  @Column({
    type: 'enum',
    enum: CommunityAuditSeverity,
    default: CommunityAuditSeverity.LOW,
  })
  @IsEnum(CommunityAuditSeverity, { message: 'Invalid severity level' })
  severity: CommunityAuditSeverity;

  @ApiPropertyOptional({ description: 'User who performed the action' })
  @Column({ name: 'performed_by', nullable: true })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional({ description: 'Target entity ID (user, space, message, etc.)' })
  @Column({ name: 'target_id', nullable: true })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Target entity type (user, space, message, etc.)' })
  @Column({ name: 'target_type', nullable: true })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: 'Human-readable description of the action' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional data related to the action' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Changes made (before/after)' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @Column({ name: 'ip_address', nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @Column({ name: 'user_agent', nullable: true })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by' })
  performer?: User;

  // Helper Methods
  static createMemberJoined(
    communityId: string,
    userId: string,
    invitedBy?: string,
    method?: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.MEMBER_JOINED,
      severity: CommunityAuditSeverity.LOW,
      targetId: userId,
      targetType: 'user',
      description: `User joined the community`,
      data: {
        invitedBy,
        joinMethod: method,
      },
    };
  }

  static createMemberLeft(
    communityId: string,
    userId: string,
    reason?: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.MEMBER_LEFT,
      severity: CommunityAuditSeverity.LOW,
      targetId: userId,
      targetType: 'user',
      description: `User left the community`,
      data: { reason },
    };
  }

  static createMemberKicked(
    communityId: string,
    kickedUserId: string,
    performedBy: string,
    reason?: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.MEMBER_KICKED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: kickedUserId,
      targetType: 'user',
      description: `User was kicked from the community`,
      data: { reason },
    };
  }

  static createMemberBanned(
    communityId: string,
    bannedUserId: string,
    performedBy: string,
    reason?: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.MEMBER_BANNED,
      severity: CommunityAuditSeverity.HIGH,
      performedBy,
      targetId: bannedUserId,
      targetType: 'user',
      description: `User was banned from the community`,
      data: { reason },
    };
  }

  static createRoleChanged(
    communityId: string,
    userId: string,
    performedBy: string,
    oldRole: string,
    newRole: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.MEMBER_ROLE_CHANGED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: userId,
      targetType: 'user',
      description: `User role changed from ${oldRole} to ${newRole}`,
      changes: {
        role: { before: oldRole, after: newRole },
      },
    };
  }

  static createSpaceCreated(
    communityId: string,
    spaceId: string,
    performedBy: string,
    spaceName: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.SPACE_CREATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      targetId: spaceId,
      targetType: 'space',
      description: `Space "${spaceName}" was created`,
      data: { spaceName },
    };
  }

  static createSpaceDeleted(
    communityId: string,
    spaceId: string,
    performedBy: string,
    spaceName: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.SPACE_DELETED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: spaceId,
      targetType: 'space',
      description: `Space "${spaceName}" was deleted`,
      data: { spaceName },
    };
  }

  static createInviteCreated(
    communityId: string,
    inviteId: string,
    performedBy: string,
    inviteType: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.INVITE_CREATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      targetId: inviteId,
      targetType: 'invite',
      description: `${inviteType} invite was created`,
      data: { inviteType },
    };
  }

  static createAutoModeration(
    communityId: string,
    userId: string,
    reason: string,
    details: Record<string, any>,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action: CommunityAuditAction.AUTO_MODERATION_TRIGGERED,
      severity: CommunityAuditSeverity.MEDIUM,
      targetId: userId,
      targetType: 'user',
      description: `Auto-moderation triggered: ${reason}`,
      data: details,
    };
  }

  static createSecurityEvent(
    communityId: string,
    action: CommunityAuditAction,
    userId?: string,
    description?: string,
    ipAddress?: string,
  ): Partial<CommunityAuditLog> {
    return {
      communityId,
      action,
      severity: CommunityAuditSeverity.HIGH,
      targetId: userId,
      targetType: 'user',
      description,
      ipAddress,
    };
  }

  isCritical(): boolean {
    return this.severity === CommunityAuditSeverity.CRITICAL;
  }

  isHigh(): boolean {
    return this.severity === CommunityAuditSeverity.HIGH;
  }

  isMedium(): boolean {
    return this.severity === CommunityAuditSeverity.MEDIUM;
  }

  isLow(): boolean {
    return this.severity === CommunityAuditSeverity.LOW;
  }

  isSecurityAction(): boolean {
    const securityActions = [
      CommunityAuditAction.SUSPICIOUS_ACTIVITY,
      CommunityAuditAction.LOGIN_ATTEMPT_FAILED,
      CommunityAuditAction.ACCOUNT_LOCKED,
      CommunityAuditAction.PASSWORD_CHANGED,
    ];
    return securityActions.includes(this.action);
  }

  isModerationAction(): boolean {
    const moderationActions = [
      CommunityAuditAction.MEMBER_KICKED,
      CommunityAuditAction.MEMBER_BANNED,
      CommunityAuditAction.MEMBER_WARNED,
      CommunityAuditAction.MEMBER_MUTED,
      CommunityAuditAction.AUTO_MODERATION_TRIGGERED,
      CommunityAuditAction.BANNED_WORD_DETECTED,
      CommunityAuditAction.SPAM_DETECTED,
    ];
    return moderationActions.includes(this.action);
  }

  isAdministrativeAction(): boolean {
    const adminActions = [
      CommunityAuditAction.COMMUNITY_SETTINGS_CHANGED,
      CommunityAuditAction.MEMBER_ROLE_CHANGED,
      CommunityAuditAction.MEMBER_PERMISSIONS_CHANGED,
      CommunityAuditAction.ROLE_CREATED,
      CommunityAuditAction.ROLE_UPDATED,
      CommunityAuditAction.ROLE_DELETED,
      CommunityAuditAction.PERMISSION_GRANTED,
      CommunityAuditAction.PERMISSION_REVOKED,
    ];
    return adminActions.includes(this.action);
  }

  getActionDisplayName(): string {
    return this.action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getSeverityColor(): string {
    switch (this.severity) {
      case CommunityAuditSeverity.CRITICAL:
        return '#dc2626'; // red-600
      case CommunityAuditSeverity.HIGH:
        return '#ea580c'; // orange-600
      case CommunityAuditSeverity.MEDIUM:
        return '#d97706'; // amber-600
      case CommunityAuditSeverity.LOW:
        return '#059669'; // emerald-600
      default:
        return '#6b7280'; // gray-500
    }
  }

  getTimeAgo(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    
    return this.createdAt.toLocaleDateString();
  }
}
