import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UploadSessionStatus } from '../enums/file.enum';

@Entity('upload_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['expiresAt'])
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  @Index()
  userId: string;

  @Column('varchar', { length: 255 })
  filename: string;

  @Column('varchar', { length: 100 })
  mimeType: string;

  @Column('bigint')
  totalSize: number;

  @Column('bigint', { default: 0 })
  uploadedSize: number;

  @Column('int', { default: 1048576 }) // 1MB chunks
  chunkSize: number;

  @Column('int', { default: 0 })
  totalChunks: number;

  @Column('int', { default: 0 })
  uploadedChunks: number;

  @Column('enum', { enum: UploadSessionStatus, default: UploadSessionStatus.ACTIVE })
  status: UploadSessionStatus;

  @Column('json', { nullable: true })
  uploadedChunksList?: number[];

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column('varchar', { length: 255, nullable: true })
  tempFilePath?: string;

  @Column('timestamp')
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Virtual properties
  get progressPercentage(): number {
    if (this.totalSize === 0) return 0;
    return Math.round((this.uploadedSize / this.totalSize) * 100);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isCompleted(): boolean {
    return this.status === UploadSessionStatus.COMPLETED;
  }

  get remainingChunks(): number[] {
    if (!this.uploadedChunksList || this.uploadedChunksList.length === 0) {
      return Array.from({ length: this.totalChunks }, (_, i) => i);
    }
    
    const allChunks = Array.from({ length: this.totalChunks }, (_, i) => i);
    return allChunks.filter(chunk => !this.uploadedChunksList.includes(chunk));
  }
}
