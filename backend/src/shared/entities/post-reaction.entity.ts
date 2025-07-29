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
import { User } from './user.entity';
import { Post } from './post.entity';
import { PostComment } from './post-comment.entity';

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
  CARE = 'care',
  CELEBRATE = 'celebrate',
  SUPPORT = 'support',
  INSIGHTFUL = 'insightful',
  FUNNY = 'funny',
  CONFUSED = 'confused',
}

export enum ReactionTarget {
  POST = 'post',
  COMMENT = 'comment',
}

@Entity('post_reactions')
@Index(['postId', 'type'])
@Index(['commentId', 'type'])
@Index(['userId', 'type'])
@Index(['targetType', 'type'])
@Unique(['userId', 'postId', 'targetType']) // User can only react once per post
@Unique(['userId', 'commentId', 'targetType']) // User can only react once per comment
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReactionType,
    default: ReactionType.LIKE,
  })
  type: ReactionType;

  @Column({
    type: 'enum',
    enum: ReactionTarget,
  })
  targetType: ReactionTarget;

  // User relationship
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Post relationship (when reacting to post)
  @Column({ type: 'uuid', nullable: true })
  postId: string;

  @ManyToOne(() => Post, post => post.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // Comment relationship (when reacting to comment)
  @Column({ type: 'uuid', nullable: true })
  commentId: string;

  @ManyToOne(() => PostComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: PostComment;

  // Metadata for analytics
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string; // web, mobile, api
    device?: string;
    location?: {
      country: string;
      city: string;
    };
    previousReaction?: ReactionType;
    sessionId?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  static getEmojiForType(type: ReactionType): string {
    const emojiMap = {
      [ReactionType.LIKE]: '👍',
      [ReactionType.LOVE]: '❤️',
      [ReactionType.LAUGH]: '😂',
      [ReactionType.WOW]: '😮',
      [ReactionType.SAD]: '😢',
      [ReactionType.ANGRY]: '😠',
      [ReactionType.CARE]: '🤗',
      [ReactionType.CELEBRATE]: '🎉',
      [ReactionType.SUPPORT]: '💪',
      [ReactionType.INSIGHTFUL]: '💡',
      [ReactionType.FUNNY]: '😄',
      [ReactionType.CONFUSED]: '🤔',
    };
    return emojiMap[type];
  }

  get emoji(): string {
    return PostReaction.getEmojiForType(this.type);
  }
}
