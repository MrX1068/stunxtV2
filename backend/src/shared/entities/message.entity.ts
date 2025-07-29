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
import { IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsDate, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  SYSTEM = 'system',
  REPLY = 'reply',
  FORWARD = 'forward',
  THREAD = 'thread',
  ANNOUNCEMENT = 'announcement',
}

export enum MessageStatus {
  PENDING = 'pending',         // Being processed
  SENT = 'sent',              // Successfully sent to server
  DELIVERED = 'delivered',    // Delivered to recipient's device
  READ = 'read',              // Read by recipient
  FAILED = 'failed',          // Failed to send
  DELETED = 'deleted',        // Soft deleted
  EDITED = 'edited',          // Message was edited
  MODERATED = 'moderated',    // Under moderation review
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['type', 'status'])
@Index(['parentMessageId'])
@Index(['threadId'])
export class Message {
  @ApiProperty({ description: 'Message ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Conversation ID' })
  @Column({ name: 'conversation_id' })
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Sender user ID' })
  @Column({ name: 'sender_id' })
  @IsNotEmpty()
  @IsUUID()
  senderId: string;

  @ApiProperty({ description: 'Message type', enum: MessageType })
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType, { message: 'Invalid message type' })
  type: MessageType;

  @ApiProperty({ description: 'Message content (text, caption, etc.)' })
  @Column({ type: 'text' })
  @IsNotEmpty()
  @Length(1, 10000, { message: 'Message content must be between 1 and 10000 characters' })
  content: string;

  @ApiPropertyOptional({ description: 'Formatted content (HTML/Markdown)' })
  @Column({ name: 'formatted_content', type: 'text', nullable: true })
  @IsOptional()
  formattedContent?: string;

  @ApiProperty({ description: 'Message status', enum: MessageStatus })
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  @IsEnum(MessageStatus, { message: 'Invalid message status' })
  status: MessageStatus;

  @ApiProperty({ description: 'Message priority', enum: MessagePriority })
  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.NORMAL,
  })
  @IsEnum(MessagePriority, { message: 'Invalid message priority' })
  priority: MessagePriority;

  // Thread & Reply Support
  @ApiPropertyOptional({ description: 'Parent message ID (for replies)' })
  @Column({ name: 'parent_message_id', nullable: true })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'Thread ID (for threaded conversations)' })
  @Column({ name: 'thread_id', nullable: true })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiPropertyOptional({ description: 'Reply count (for thread starters)' })
  @Column({ default: 0 })
  @IsNumber()
  replyCount: number;

  // Enterprise Delivery Tracking
  @ApiProperty({ description: 'Server timestamp when message was received' })
  @Column({ name: 'server_timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate()
  serverTimestamp: Date;

  @ApiPropertyOptional({ description: 'Client timestamp when message was sent' })
  @Column({ name: 'client_timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  clientTimestamp?: Date;

  @ApiPropertyOptional({ description: 'Delivery timestamp' })
  @Column({ name: 'delivered_at', nullable: true })
  @IsOptional()
  @IsDate()
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'Read timestamp' })
  @Column({ name: 'read_at', nullable: true })
  @IsOptional()
  @IsDate()
  readAt?: Date;

  @ApiPropertyOptional({ description: 'Edit timestamp' })
  @Column({ name: 'edited_at', nullable: true })
  @IsOptional()
  @IsDate()
  editedAt?: Date;

  // Message Features
  @ApiProperty({ description: 'Is message pinned' })
  @Column({ default: false })
  @IsBoolean()
  isPinned: boolean;

  @ApiProperty({ description: 'Is message encrypted' })
  @Column({ default: false })
  @IsBoolean()
  isEncrypted: boolean;

  @ApiProperty({ description: 'Is message from system/bot' })
  @Column({ default: false })
  @IsBoolean()
  isSystem: boolean;

  @ApiProperty({ description: 'Is message edited' })
  @Column({ default: false })
  @IsBoolean()
  isEdited: boolean;

  @ApiProperty({ description: 'Is message forwarded' })
  @Column({ default: false })
  @IsBoolean()
  isForwarded: boolean;

  // Metrics & Analytics
  @ApiProperty({ description: 'Reaction count' })
  @Column({ default: 0 })
  @IsNumber()
  reactionCount: number;

  @ApiProperty({ description: 'View count' })
  @Column({ default: 0 })
  @IsNumber()
  viewCount: number;

  @ApiProperty({ description: 'Forward count' })
  @Column({ default: 0 })
  @IsNumber()
  forwardCount: number;

  // Moderation
  @ApiProperty({ description: 'Is message flagged for review' })
  @Column({ default: false })
  @IsBoolean()
  isFlagged: boolean;

  @ApiProperty({ description: 'Moderation score (0-100)' })
  @Column({ default: 0 })
  @IsNumber()
  moderationScore: number;

  @ApiPropertyOptional({ description: 'Moderation notes' })
  @Column({ name: 'moderation_notes', type: 'text', nullable: true })
  @IsOptional()
  moderationNotes?: string;

  // File & Media Information
  @ApiPropertyOptional({ description: 'File URL for media messages' })
  @Column({ name: 'file_url', nullable: true })
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'File name' })
  @Column({ name: 'file_name', nullable: true })
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @Column({ name: 'file_size', nullable: true })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'File MIME type' })
  @Column({ name: 'file_mime_type', nullable: true })
  @IsOptional()
  fileMimeType?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL for media' })
  @Column({ name: 'thumbnail_url', nullable: true })
  @IsOptional()
  thumbnailUrl?: string;

  // Message Metadata
  @ApiProperty({ description: 'Message metadata (mentions, links, etc.)' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    mentions?: string[];
    links?: string[];
    hashtags?: string[];
    originalMessageId?: string; // For forwards
    editHistory?: Array<{
      content: string;
      timestamp: Date;
    }>;
    clientInfo?: {
      platform: string;
      version: string;
      deviceId?: string;
    };
  };

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
  @ManyToOne(() => Conversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage?: Message;

  @OneToMany(() => Message, message => message.parentMessage)
  replies: Message[];

  // Enterprise Helper Methods
  isTextMessage(): boolean {
    return this.type === MessageType.TEXT;
  }

  isMediaMessage(): boolean {
    return [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.FILE].includes(this.type);
  }

  isThreadStarter(): boolean {
    return !this.parentMessageId && this.replyCount > 0;
  }

  isReply(): boolean {
    return !!this.parentMessageId;
  }

  canBeEdited(): boolean {
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    const now = new Date().getTime();
    const messageTime = this.createdAt.getTime();
    
    return (
      !this.isSystem &&
      !this.isDeleted() &&
      (now - messageTime) < editTimeLimit
    );
  }

  canBeDeleted(): boolean {
    return !this.isSystem && !this.isDeleted();
  }

  isDelivered(): boolean {
    return [MessageStatus.DELIVERED, MessageStatus.READ].includes(this.status);
  }

  isRead(): boolean {
    return this.status === MessageStatus.READ;
  }

  isDeleted(): boolean {
    return this.status === MessageStatus.DELETED || !!this.deletedAt;
  }

  markAsEdited(newContent: string): void {
    if (!this.metadata.editHistory) {
      this.metadata.editHistory = [];
    }
    
    this.metadata.editHistory.push({
      content: this.content,
      timestamp: new Date(),
    });
    
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    this.status = MessageStatus.EDITED;
  }

  markAsDelivered(): void {
    if (this.status === MessageStatus.SENT) {
      this.status = MessageStatus.DELIVERED;
      this.deliveredAt = new Date();
    }
  }

  markAsRead(): void {
    if ([MessageStatus.SENT, MessageStatus.DELIVERED].includes(this.status)) {
      this.status = MessageStatus.READ;
      this.readAt = new Date();
    }
  }

  addReaction(): void {
    this.reactionCount += 1;
  }

  removeReaction(): void {
    if (this.reactionCount > 0) {
      this.reactionCount -= 1;
    }
  }

  incrementViews(): void {
    this.viewCount += 1;
  }

  generatePreview(maxLength: number = 100): string {
    if (this.isMediaMessage()) {
      switch (this.type) {
        case MessageType.IMAGE:
          return '📷 Image';
        case MessageType.VIDEO:
          return '🎥 Video';
        case MessageType.AUDIO:
          return '🎵 Audio';
        case MessageType.FILE:
          return `📎 ${this.fileName || 'File'}`;
        default:
          return 'Media';
      }
    }
    
    const content = this.content.replace(/\n/g, ' ').trim();
    return content.length > maxLength 
      ? `${content.substring(0, maxLength)}...` 
      : content;
  }

  // Extract mentions from content
  extractMentions(): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(this.content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  // Extract hashtags from content
  extractHashtags(): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(this.content)) !== null) {
      hashtags.push(match[1]);
    }
    
    return hashtags;
  }

  // Extract URLs from content
  extractUrls(): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return this.content.match(urlRegex) || [];
  }

  // Update metadata with extracted information
  updateMetadata(): void {
    this.metadata = {
      ...this.metadata,
      mentions: this.extractMentions(),
      hashtags: this.extractHashtags(),
      links: this.extractUrls(),
    };
  }
}
