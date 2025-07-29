import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsOptional, IsEnum, IsNumber, IsBoolean, IsDate, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Message } from './message.entity';
import { User } from './user.entity';
import { Community } from './community.entity';
import { Space } from './space.entity';

export enum ConversationType {
  DIRECT = 'direct',           // 1-on-1 chat
  GROUP = 'group',             // Group chat (custom)
  SPACE = 'space',             // Space/channel chat
  COMMUNITY = 'community',     // Community-wide chat
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  MUTED = 'muted',
}

@Entity('conversations')
@Index(['type', 'status'])
@Index(['spaceId', 'status'])
@Index(['communityId', 'status'])
@Index(['lastMessageAt'])
export class Conversation {
  @ApiProperty({ description: 'Conversation ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Conversation type', enum: ConversationType })
  @Column({
    type: 'enum',
    enum: ConversationType,
  })
  @IsEnum(ConversationType, { message: 'Invalid conversation type' })
  type: ConversationType;

  @ApiPropertyOptional({ description: 'Conversation name (for groups)' })
  @Column({ nullable: true })
  @IsOptional()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name?: string;

  @ApiPropertyOptional({ description: 'Conversation description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({ description: 'Conversation avatar URL' })
  @Column({ name: 'avatar_url', nullable: true })
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: 'Conversation status', enum: ConversationStatus })
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  @IsEnum(ConversationStatus, { message: 'Invalid conversation status' })
  status: ConversationStatus;

  @ApiPropertyOptional({ description: 'Associated community ID' })
  @Column({ name: 'community_id', nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @ApiPropertyOptional({ description: 'Associated space ID' })
  @Column({ name: 'space_id', nullable: true })
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @ApiPropertyOptional({ description: 'Conversation creator ID' })
  @Column({ name: 'created_by', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiProperty({ description: 'Total message count' })
  @Column({ default: 0 })
  @IsNumber()
  messageCount: number;

  @ApiProperty({ description: 'Active participant count' })
  @Column({ default: 0 })
  @IsNumber()
  participantCount: number;

  @ApiPropertyOptional({ description: 'Last message timestamp' })
  @Column({ name: 'last_message_at', nullable: true })
  @IsOptional()
  @IsDate()
  lastMessageAt?: Date;

  @ApiPropertyOptional({ description: 'Last message preview' })
  @Column({ name: 'last_message_preview', nullable: true })
  @IsOptional()
  lastMessagePreview?: string;

  @ApiPropertyOptional({ description: 'Last message sender ID' })
  @Column({ name: 'last_message_sender_id', nullable: true })
  @IsOptional()
  @IsUUID()
  lastMessageSenderId?: string;

  // Enterprise Chat Settings
  @ApiProperty({ description: 'Allow file uploads' })
  @Column({ default: true })
  @IsBoolean()
  allowFileUploads: boolean;

  @ApiProperty({ description: 'Allow message reactions' })
  @Column({ default: true })
  @IsBoolean()
  allowReactions: boolean;

  @ApiProperty({ description: 'Allow message editing' })
  @Column({ default: true })
  @IsBoolean()
  allowEditing: boolean;

  @ApiProperty({ description: 'Allow message deletion' })
  @Column({ default: true })
  @IsBoolean()
  allowDeletion: boolean;

  @ApiProperty({ description: 'Enable typing indicators' })
  @Column({ default: true })
  @IsBoolean()
  enableTypingIndicators: boolean;

  @ApiProperty({ description: 'Enable read receipts' })
  @Column({ default: true })
  @IsBoolean()
  enableReadReceipts: boolean;

  @ApiProperty({ description: 'Enable message threads' })
  @Column({ default: false })
  @IsBoolean()
  enableThreads: boolean;

  // Performance & Rate Limiting
  @ApiProperty({ description: 'Maximum message length' })
  @Column({ default: 4000 })
  @IsNumber()
  maxMessageLength: number;

  @ApiProperty({ description: 'Rate limit (messages per minute)' })
  @Column({ default: 60 })
  @IsNumber()
  rateLimitPerMinute: number;

  // Moderation
  @ApiProperty({ description: 'Enable automatic moderation' })
  @Column({ default: false })
  @IsBoolean()
  enableAutoModeration: boolean;

  @ApiProperty({ description: 'Require message approval' })
  @Column({ default: false })
  @IsBoolean()
  requireApproval: boolean;

  // Metadata
  @ApiProperty({ description: 'Conversation metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Deletion timestamp' })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community?: Community;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space?: Space;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_message_sender_id' })
  lastMessageSender?: User;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  // Enterprise Helper Methods
  isDirect(): boolean {
    return this.type === ConversationType.DIRECT;
  }

  isGroup(): boolean {
    return this.type === ConversationType.GROUP;
  }

  isSpace(): boolean {
    return this.type === ConversationType.SPACE;
  }

  isCommunity(): boolean {
    return this.type === ConversationType.COMMUNITY;
  }

  isActive(): boolean {
    return this.status === ConversationStatus.ACTIVE;
  }

  updateLastMessage(senderId: string, preview: string): void {
    this.lastMessageAt = new Date();
    this.lastMessageSenderId = senderId;
    this.lastMessagePreview = preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
    this.messageCount += 1;
  }

  generateDisplayName(participants: User[]): string {
    if (this.name) return this.name;
    
    if (this.isDirect()) {
      return participants.map(p => p.fullName || p.username).join(', ');
    }
    
    return `Group Chat (${participants.length} members)`;
  }

  canUserSendMessage(rateLimitCache: Map<string, number[]>): boolean {
    const now = Date.now();
    const userKey = `${this.id}_rate_limit`;
    const userRequests = rateLimitCache.get(userKey) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    return recentRequests.length < this.rateLimitPerMinute;
  }
}
