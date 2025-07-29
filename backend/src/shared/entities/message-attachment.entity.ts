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
import { IsNotEmpty, IsUrl, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Message } from './message.entity';
import { User } from './user.entity';

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

@Entity('message_attachments')
@Index(['messageId'])
@Index(['uploaderId'])
@Index(['type'])
@Index(['createdAt'])
export class MessageAttachment {
  @ApiProperty({ description: 'Unique identifier for the attachment' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Message ID' })
  @Column({ name: 'message_id' })
  @Index()
  messageId!: string;

  @ApiProperty({ description: 'User ID who uploaded' })
  @Column({ name: 'uploader_id' })
  @Index()
  uploaderId!: string;

  @ApiProperty({ description: 'Original filename' })
  @Column({ name: 'original_name', length: 255 })
  @IsNotEmpty({ message: 'Original filename is required' })
  @Length(1, 255, { message: 'Filename must be between 1 and 255 characters' })
  originalName!: string;

  @ApiProperty({ description: 'Stored filename' })
  @Column({ name: 'stored_name', length: 255 })
  @IsNotEmpty({ message: 'Stored filename is required' })
  storedName!: string;

  @ApiProperty({ description: 'File URL' })
  @Column({ name: 'file_url' })
  @IsNotEmpty({ message: 'File URL is required' })
  @IsUrl({}, { message: 'Please provide a valid file URL' })
  fileUrl!: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  @Column({ name: 'thumbnail_url', nullable: true })
  @IsUrl({}, { message: 'Please provide a valid thumbnail URL' })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'File type', enum: AttachmentType })
  @Column({
    type: 'enum',
    enum: AttachmentType,
    default: AttachmentType.OTHER,
  })
  @IsEnum(AttachmentType, { message: 'Invalid attachment type' })
  @Index()
  type!: AttachmentType;

  @ApiProperty({ description: 'MIME type' })
  @Column({ name: 'mime_type', length: 100 })
  @IsNotEmpty({ message: 'MIME type is required' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ name: 'file_size' })
  fileSize!: number;

  @ApiProperty({ description: 'File dimensions (for images/videos)' })
  @Column({ type: 'jsonb', nullable: true })
  dimensions?: {
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'File duration (for audio/video)' })
  @Column({ nullable: true })
  duration?: number;

  @ApiProperty({ description: 'Attachment metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @ApiProperty({ description: 'Attachment creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationships
//   @ManyToOne(() => Message, (message) => message.attachments, {
//     onDelete: 'CASCADE',
//   })
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'uploader_id' })
  uploader!: User;

  // Helper methods
  isImage(): boolean {
    return this.type === AttachmentType.IMAGE;
  }

  isVideo(): boolean {
    return this.type === AttachmentType.VIDEO;
  }

  isAudio(): boolean {
    return this.type === AttachmentType.AUDIO;
  }

  isDocument(): boolean {
    return this.type === AttachmentType.DOCUMENT;
  }

  getFileSizeFormatted(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
