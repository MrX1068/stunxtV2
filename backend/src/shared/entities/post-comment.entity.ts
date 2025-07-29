import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

export enum CommentStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  FLAGGED = 'flagged',
  UNDER_REVIEW = 'under_review',
}

@Entity('post_comments')
@Index(['postId', 'status', 'createdAt'])
@Index(['authorId', 'status', 'createdAt'])
@Index(['parentId', 'createdAt'])
@Index(['status', 'createdAt'])
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.PUBLISHED,
  })
  status: CommentStatus;

  // Post relationship
  @Column({ type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, post => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // Author relationship
  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  // Thread support (replies to comments)
  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => PostComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: PostComment;

  @OneToMany(() => PostComment, comment => comment.parent)
  replies: PostComment[];

  // Engagement metrics
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

  // Moderation
  @Column({ type: 'float', default: 0.0 })
  moderationScore: number;

  @Column({ type: 'boolean', default: false })
  isModerated: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  moderationReason: string;

  @Column({ type: 'uuid', nullable: true })
  moderatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date;

  // Rich features
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    mentions?: string[];
    hashtags?: string[];
    editHistory?: Array<{
      editedAt: string;
      editedBy: string;
      previousContent: string;
    }>;
    attachments?: Array<{
      url: string;
      type: string;
      name: string;
      size: number;
    }>;
  };

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastEditedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  lastEditedBy: string;

  // Helper methods
  get isReply(): boolean {
    return this.parentId !== null;
  }

  get isEdited(): boolean {
    return this.lastEditedAt !== null;
  }

  get depth(): number {
    // This would need to be calculated via query for efficiency
    return this.parentId ? 1 : 0; // Simplified for now
  }
}
