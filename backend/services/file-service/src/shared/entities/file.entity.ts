import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { FileType, FileStatus, StorageProvider, FilePrivacy, FileCategory } from '../enums/file.enum';
import { FileVariant } from './file-variant.entity';

@Entity('files')
@Index(['userId'])
@Index(['status'])
@Index(['mimeType'])
@Index(['createdAt'])
@Index(['category'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 255 })
  originalName: string;

  @Column('varchar', { length: 255 })
  filename: string;

  @Column('varchar', { length: 100 })
  mimeType: string;

  @Column('enum', { enum: FileType })
  type: FileType;

  @Column('bigint')
  size: number;

  @Column('varchar', { length: 64 })
  checksum: string;

  // Storage information
  @Column('enum', { enum: StorageProvider, nullable: true })
  primaryProvider?: StorageProvider;

  @Column('text', { nullable: true })
  primaryUrl?: string;

  @Column('enum', { enum: StorageProvider, nullable: true })
  backupProvider?: StorageProvider;

  @Column('text', { nullable: true })
  backupUrl?: string;

  // File categorization
  @Column('enum', { enum: FileCategory, default: FileCategory.CONTENT })
  category: FileCategory;

  @Column('enum', { enum: FilePrivacy, default: FilePrivacy.PRIVATE })
  privacy: FilePrivacy;

  // Processing information
  @Column('enum', { enum: FileStatus, default: FileStatus.UPLOADING })
  status: FileStatus;

  @Column('json', { nullable: true })
  variants?: Record<string, any>;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column('json', { nullable: true })
  processingOptions?: Record<string, any>;

  // Analytics
  @Column('int', { default: 0 })
  downloadCount: number;

  @Column('bigint', { default: 0 })
  bandwidth: number;

  @Column('timestamp', { nullable: true })
  lastAccessed?: Date;

  // Security
  @Column('varchar', { length: 255, nullable: true })
  encryptionKey?: string;

  @Column('boolean', { default: false })
  virusScanned: boolean;

  @Column('json', { nullable: true })
  virusScanResult?: Record<string, any>;

  // CDN information
  @Column('text', { nullable: true })
  cdnUrl?: string;

  @Column('json', { nullable: true })
  cdnMetadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => FileVariant, variant => variant.file, { cascade: true })
  fileVariants: FileVariant[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Virtual properties
  get publicUrl(): string {
    if (this.privacy === FilePrivacy.PUBLIC && this.cdnUrl) {
      return this.cdnUrl;
    }
    return this.primaryUrl;
  }

  get isImage(): boolean {
    return this.type === FileType.IMAGE;
  }

  get isVideo(): boolean {
    return this.type === FileType.VIDEO;
  }

  get isDocument(): boolean {
    return this.type === FileType.DOCUMENT;
  }

  get sizeInMB(): number {
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }
}
