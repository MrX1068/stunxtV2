import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { IsEnum, IsOptional, IsDate, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin', 
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum ParticipantStatus {
  ACTIVE = 'active',
  LEFT = 'left',
  REMOVED = 'removed',
  BANNED = 'banned',
  MUTED = 'muted',
}

@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
@Index(['conversationId', 'status'])
@Index(['userId', 'status'])
@Index(['role'])
@Index(['lastReadAt'])
export class ConversationParticipant {
  @ApiProperty({ description: 'Participant ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Conversation ID' })
  @Column({ name: 'conversation_id' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Participant role', enum: ParticipantRole })
  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  @IsEnum(ParticipantRole, { message: 'Invalid participant role' })
  role: ParticipantRole;

  @ApiProperty({ description: 'Participant status', enum: ParticipantStatus })
  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.ACTIVE,
  })
  @IsEnum(ParticipantStatus, { message: 'Invalid participant status' })
  status: ParticipantStatus;

  @ApiPropertyOptional({ description: 'Custom nickname in this conversation' })
  @Column({ nullable: true })
  @IsOptional()
  nickname?: string;

  // Read Receipts & Activity
  @ApiPropertyOptional({ description: 'Last message read timestamp' })
  @Column({ name: 'last_read_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastReadAt?: Date;

  @ApiPropertyOptional({ description: 'Last seen timestamp' })
  @Column({ name: 'last_seen_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastSeenAt?: Date;

  @ApiPropertyOptional({ description: 'Last message ID read' })
  @Column({ name: 'last_read_message_id', nullable: true })
  @IsOptional()
  @IsUUID()
  lastReadMessageId?: string;

  @ApiProperty({ description: 'Unread message count' })
  @Column({ default: 0 })
  unreadCount: number;

  // Notification Settings
  @ApiProperty({ description: 'Enable push notifications' })
  @Column({ default: true })
  @IsBoolean()
  notificationsEnabled: boolean;

  @ApiProperty({ description: 'Enable sound notifications' })
  @Column({ default: true })
  @IsBoolean()
  soundEnabled: boolean;

  @ApiProperty({ description: 'Mention-only notifications' })
  @Column({ default: false })
  @IsBoolean()
  mentionOnly: boolean;

  // Permissions
  @ApiProperty({ description: 'Can send messages' })
  @Column({ default: true })
  @IsBoolean()
  canSendMessages: boolean;

  @ApiProperty({ description: 'Can upload files' })
  @Column({ default: true })
  @IsBoolean()
  canUploadFiles: boolean;

  @ApiProperty({ description: 'Can add members' })
  @Column({ default: false })
  @IsBoolean()
  canAddMembers: boolean;

  @ApiProperty({ description: 'Can edit conversation settings' })
  @Column({ default: false })
  @IsBoolean()
  canEditSettings: boolean;

  // Activity Tracking
  @ApiPropertyOptional({ description: 'When user joined conversation' })
  @Column({ name: 'joined_at', nullable: true })
  @IsOptional()
  @IsDate()
  joinedAt?: Date;

  @ApiPropertyOptional({ description: 'When user left conversation' })
  @Column({ name: 'left_at', nullable: true })
  @IsOptional()
  @IsDate()
  leftAt?: Date;

  @ApiPropertyOptional({ description: 'Who invited this user' })
  @Column({ name: 'invited_by', nullable: true })
  @IsOptional()
  @IsUUID()
  invitedBy?: string;

  @ApiPropertyOptional({ description: 'Mute expiration timestamp' })
  @Column({ name: 'muted_until', nullable: true })
  @IsOptional()
  @IsDate()
  mutedUntil?: Date;

  // Typing Indicators
  @ApiPropertyOptional({ description: 'Last typing timestamp' })
  @Column({ name: 'last_typing_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastTypingAt?: Date;

  @ApiProperty({ description: 'Is currently typing' })
  @Column({ default: false })
  @IsBoolean()
  isTyping: boolean;

  // Metadata
  @ApiProperty({ description: 'Participant metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    deviceInfo?: {
      platform: string;
      version: string;
      lastOnline?: Date;
    };
    preferences?: {
      theme?: string;
      fontSize?: number;
      language?: string;
    };
  };

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by' })
  inviter?: User;

  // Helper Methods
  isOwner(): boolean {
    return this.role === ParticipantRole.OWNER;
  }

  isAdmin(): boolean {
    return [ParticipantRole.OWNER, ParticipantRole.ADMIN].includes(this.role);
  }

  isModerator(): boolean {
    return [ParticipantRole.OWNER, ParticipantRole.ADMIN, ParticipantRole.MODERATOR].includes(this.role);
  }

  isActive(): boolean {
    return this.status === ParticipantStatus.ACTIVE;
  }

  isMuted(): boolean {
    if (this.status === ParticipantStatus.MUTED) return true;
    if (this.mutedUntil && new Date() < this.mutedUntil) return true;
    return false;
  }

  isBanned(): boolean {
    return this.status === ParticipantStatus.BANNED;
  }

  hasLeft(): boolean {
    return [ParticipantStatus.LEFT, ParticipantStatus.REMOVED].includes(this.status);
  }

  canPerformAction(action: string): boolean {
    if (!this.isActive() || this.isBanned()) return false;
    
    switch (action) {
      case 'send_message':
        return this.canSendMessages && !this.isMuted();
      case 'upload_file':
        return this.canUploadFiles && this.canSendMessages && !this.isMuted();
      case 'add_member':
        return this.canAddMembers && this.isModerator();
      case 'edit_settings':
        return this.canEditSettings && this.isAdmin();
      case 'remove_member':
        return this.isModerator();
      case 'ban_member':
        return this.isAdmin();
      default:
        return false;
    }
  }

  updateLastRead(messageId: string): void {
    this.lastReadAt = new Date();
    this.lastReadMessageId = messageId;
    this.unreadCount = 0;
  }

  incrementUnreadCount(): void {
    this.unreadCount += 1;
  }

  markAsTyping(): void {
    this.isTyping = true;
    this.lastTypingAt = new Date();
  }

  stopTyping(): void {
    this.isTyping = false;
  }

  updateLastSeen(): void {
    this.lastSeenAt = new Date();
  }

  muteFor(duration: number): void {
    this.mutedUntil = new Date(Date.now() + duration);
    if (this.status === ParticipantStatus.ACTIVE) {
      this.status = ParticipantStatus.MUTED;
    }
  }

  unmute(): void {
    this.mutedUntil = null;
    if (this.status === ParticipantStatus.MUTED) {
      this.status = ParticipantStatus.ACTIVE;
    }
  }

  leave(): void {
    this.status = ParticipantStatus.LEFT;
    this.leftAt = new Date();
  }

  remove(): void {
    this.status = ParticipantStatus.REMOVED;
    this.leftAt = new Date();
  }

  ban(): void {
    this.status = ParticipantStatus.BANNED;
    this.leftAt = new Date();
  }

  rejoin(): void {
    this.status = ParticipantStatus.ACTIVE;
    this.leftAt = null;
    this.joinedAt = new Date();
  }
}
