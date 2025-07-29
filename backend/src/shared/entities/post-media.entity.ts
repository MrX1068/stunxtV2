import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  GIF = 'gif',
  THUMBNAIL = 'thumbnail',
}

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

@Entity('post_media')
@Index(['postId', 'type'])
@Index(['status', 'createdAt'])
@Index(['type', 'status'])
export class PostMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1000 })
  url: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.UPLOADING,
  })
  status: MediaStatus;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'int', nullable: true })
  duration: number; // for videos/audio in seconds

  @Column({ type: 'int', default: 0 })
  order: number; // for multiple media in same post

  // Post relationship
  @Column({ type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, post => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // Alt text for accessibility
  @Column({ type: 'varchar', length: 500, nullable: true })
  altText: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string;

  // Media processing metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Image/Video specific
    fps?: number;
    bitrate?: number;
    codec?: string;
    format?: string;
    colorSpace?: string;
    
    // Processing info
    originalUrl?: string;
    processedVariants?: Array<{
      quality: string;
      url: string;
      width: number;
      height: number;
      size: number;
    }>;
    
    // Upload info
    uploadSource?: string;
    uploadedBy?: string;
    uploadSession?: string;
    
    // CDN info
    cdnUrl?: string;
    cdnProvider?: string;
    
    // EXIF data for images
    exif?: {
      camera?: string;
      lens?: string;
      focalLength?: string;
      aperture?: string;
      iso?: string;
      shutterSpeed?: string;
      dateTaken?: string;
      location?: {
        latitude: number;
        longitude: number;
      };
    };
    
    // Analysis results
    contentAnalysis?: {
      isNsfw?: boolean;
      confidence?: number;
      tags?: string[];
      faces?: number;
      objects?: string[];
    };
    
    // Performance metrics
    loadTime?: number;
    compressionRatio?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  // Helper methods
  get isImage(): boolean {
    return this.type === MediaType.IMAGE || this.type === MediaType.GIF;
  }

  get isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }

  get isAudio(): boolean {
    return this.type === MediaType.AUDIO;
  }

  get isDocument(): boolean {
    return this.type === MediaType.DOCUMENT;
  }

  get aspectRatio(): number | null {
    if (!this.width || !this.height) return null;
    return this.width / this.height;
  }

  get formattedSize(): string {
    const bytes = Number(this.size);
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get formattedDuration(): string | null {
    if (!this.duration) return null;
    
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
