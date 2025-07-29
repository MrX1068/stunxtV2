import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { File } from './file.entity';
import { VariantType } from '../enums/file.enum';

@Entity('file_variants')
@Unique(['fileId', 'variant'])
@Index(['fileId'])
@Index(['variant'])
export class FileVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  fileId: string;

  @Column('enum', { enum: VariantType })
  variant: VariantType;

  @Column('text')
  url: string;

  @Column('int', { nullable: true })
  width?: number;

  @Column('int', { nullable: true })
  height?: number;

  @Column('bigint')
  size: number;

  @Column('varchar', { length: 20 })
  format: string;

  @Column('int', { nullable: true })
  quality?: number;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => File, file => file.fileVariants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @CreateDateColumn()
  createdAt: Date;

  // Virtual properties
  get sizeInMB(): number {
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }

  get dimensions(): string | null {
    if (this.width && this.height) {
      return `${this.width}x${this.height}`;
    }
    return null;
  }
}
