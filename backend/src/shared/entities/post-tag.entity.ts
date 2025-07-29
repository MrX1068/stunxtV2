import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_tags')
@Index(['postId', 'tagName'])
@Index(['tagName', 'createdAt'])
@Unique(['postId', 'tagName']) // Prevent duplicate tags on same post
export class PostTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  tagName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tagCategory: string; // e.g., 'topic', 'skill', 'technology', 'location'

  // Post relationship
  @Column({ type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, post => post.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // Tag metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    color?: string;
    description?: string;
    isOfficial?: boolean; // Official/verified tags
    popularity?: number;
    relatedTags?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  get normalizedName(): string {
    return this.tagName.toLowerCase().trim().replace(/\s+/g, '-');
  }

  get displayName(): string {
    return this.tagName.charAt(0).toUpperCase() + this.tagName.slice(1);
  }
}
