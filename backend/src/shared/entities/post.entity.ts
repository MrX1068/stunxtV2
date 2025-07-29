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
import { IsNotEmpty, IsOptional, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Community } from './community.entity';
import { Space } from './space.entity';
import { User } from './user.entity';
import { PostComment } from './post-comment.entity';
import { PostReaction } from './post-reaction.entity';
import { PostTag } from './post-tag.entity';
import { PostMedia } from './post-media.entity';

export enum PostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  POLL = 'poll',
  EVENT = 'event',
  DOCUMENT = 'document',
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  FLAGGED = 'flagged',
  UNDER_REVIEW = 'under_review',
  ARCHIVED = 'archived',
}

export enum PostVisibility {
  PUBLIC = 'public',
  COMMUNITY_ONLY = 'community_only',
  SPACE_ONLY = 'space_only',
  FOLLOWERS_ONLY = 'followers_only',
  PRIVATE = 'private',
}

export enum ContentType {
  PLAIN_TEXT = 'plain_text',
  MARKDOWN = 'markdown',
  RICH_TEXT = 'rich_text',
  HTML = 'html',
}

@Entity('posts')
@Index(['title'])
@Index(['communityId'])
@Index(['spaceId'])
@Index(['authorId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
@Index(['authorId', 'status', 'createdAt'])
@Index(['communityId', 'status', 'createdAt'])
@Index(['spaceId', 'status', 'createdAt'])
@Index(['status', 'visibility', 'createdAt'])
@Index(['type', 'status', 'createdAt'])
@Index(['isPinned', 'communityId', 'createdAt'])
@Index(['slug'], { unique: true })
export class Post {
  @ApiProperty({ description: 'Unique identifier for the post' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Post title' })
  @Column({ length: 255 })
  @IsNotEmpty({ message: 'Post title is required' })
  @Length(3, 255, { message: 'Post title must be between 3 and 255 characters' })
  title!: string;

  @ApiProperty({ description: 'Post URL slug' })
  @Column({ length: 255, unique: true })
  @IsNotEmpty({ message: 'Post slug is required' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Post content' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Content type for rendering' })
  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.RICH_TEXT,
  })
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Post excerpt for previews' })
  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @ApiProperty({ description: 'Post type', enum: PostType })
  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.TEXT,
  })
  @IsEnum(PostType, { message: 'Invalid post type' })
  type!: PostType;

  @ApiProperty({ description: 'Post status', enum: PostStatus })
  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.PUBLISHED,
  })
  @IsEnum(PostStatus, { message: 'Invalid post status' })
  status!: PostStatus;

  @ApiPropertyOptional({ description: 'Post visibility level' })
  @Column({
    type: 'enum',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
  })
  visibility?: PostVisibility;

  @ApiProperty({ description: 'Community ID this post belongs to' })
  @Column({ name: 'community_id', nullable: true })
  communityId?: string;

  @ApiProperty({ description: 'Space ID this post belongs to' })
  @Column({ name: 'space_id', nullable: true })
  spaceId?: string;

  @ApiProperty({ description: 'Post author ID' })
  @Column({ name: 'author_id' })
  authorId!: string;

  @ApiProperty({ description: 'Like count' })
  @Column({ name: 'like_count', default: 0 })
  likeCount!: number;

  @ApiProperty({ description: 'Comment count' })
  @Column({ name: 'comment_count', default: 0 })
  commentCount!: number;

  @ApiProperty({ description: 'View count' })
  @Column({ name: 'view_count', default: 0 })
  viewCount!: number;

  @ApiPropertyOptional({ description: 'Share count' })
  @Column({ name: 'share_count', default: 0 })
  shareCount?: number;

  @ApiPropertyOptional({ description: 'Bookmark count' })
  @Column({ name: 'bookmark_count', default: 0 })
  bookmarkCount?: number;

  @ApiPropertyOptional({ description: 'Dislike count' })
  @Column({ name: 'dislike_count', default: 0 })
  dislikeCount?: number;

  @ApiProperty({ description: 'Whether post is pinned' })
  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean;

  @ApiProperty({ description: 'Whether post is featured' })
  @Column({ name: 'is_featured', default: false })
  isFeatured!: boolean;

  @ApiPropertyOptional({ description: 'Post category' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @ApiPropertyOptional({ description: 'Post subcategory' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @Column({ type: 'varchar', length: 160, nullable: true })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Keywords for search' })
  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Allow comments on this post' })
  @Column({ name: 'allow_comments', default: true })
  allowComments?: boolean;

  @ApiPropertyOptional({ description: 'Allow reactions on this post' })
  @Column({ name: 'allow_reactions', default: true })
  allowReactions?: boolean;

  @ApiPropertyOptional({ description: 'Allow sharing of this post' })
  @Column({ name: 'allow_sharing', default: true })
  allowSharing?: boolean;

  @ApiProperty({ description: 'Post tags' })
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Content moderation score' })
  @Column({ type: 'float', default: 0.0, name: 'moderation_score' })
  moderationScore?: number;

  @ApiPropertyOptional({ description: 'Whether post has been moderated' })
  @Column({ name: 'is_moderated', default: false })
  isModerated?: boolean;

  @ApiPropertyOptional({ description: 'Moderation reason if flagged' })
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'moderation_reason' })
  moderationReason?: string;

  @ApiPropertyOptional({ description: 'Content warnings' })
  @Column('simple-array', { nullable: true, name: 'content_warnings' })
  contentWarnings?: string[];

  @ApiPropertyOptional({ description: 'Whether post contains NSFW content' })
  @Column({ name: 'is_nsfw', default: false })
  isNsfw?: boolean;

  @ApiPropertyOptional({ description: 'Whether post contains spoilers' })
  @Column({ name: 'is_spoiler', default: false })
  isSpoiler?: boolean;

  @ApiPropertyOptional({ description: 'When post was published' })
  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt?: Date;

  @ApiPropertyOptional({ description: 'When post is scheduled to publish' })
  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_for' })
  scheduledFor?: Date;

  @ApiProperty({ description: 'Post metadata in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  metadata!: {
    // For link posts
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImage?: string;
    linkDomain?: string;
    
    // For poll posts
    pollOptions?: Array<{
      id: string;
      text: string;
      voteCount: number;
    }>;
    pollEndsAt?: string;
    pollAllowMultiple?: boolean;
    
    // For event posts
    eventStartDate?: string;
    eventEndDate?: string;
    eventLocation?: string;
    eventType?: string;
    eventCapacity?: number;
    eventAttendeeCount?: number;
    
    // For media posts
    mediaCount?: number;
    mediaDuration?: number;
    
    // Mentions and hashtags
    mentions?: string[];
    hashtags?: string[];
    
    // Edit history
    editHistory?: Array<{
      editedAt: string;
      editedBy: string;
      previousContent: string;
      reason?: string;
    }>;
    
    // Algorithm and engagement hints
    engagementScore?: number;
    trendingScore?: number;
    qualityScore?: number;
    
    // Location data
    location?: {
      name: string;
      latitude: number;
      longitude: number;
      city: string;
      country: string;
    };
    
    // Other metadata
    [key: string]: any;
  };

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Record deletion timestamp (soft delete)' })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Community, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'community_id' })
  community?: Community;

  @ManyToOne(() => Space, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'space_id' })
  space?: Space;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  // New relationships for enterprise features
  @OneToMany(() => PostComment, comment => comment.post, { cascade: true })
  comments: PostComment[];

  @OneToMany(() => PostReaction, reaction => reaction.post, { cascade: true })
  reactions: PostReaction[];

  @OneToMany(() => PostTag, postTag => postTag.post, { cascade: true })
  postTags: PostTag[];

  @OneToMany(() => PostMedia, media => media.post, { cascade: true })
  media: PostMedia[];

  // Helper methods
  isPublished(): boolean {
    return this.status === PostStatus.PUBLISHED;
  }

  isDraft(): boolean {
    return this.status === PostStatus.DRAFT;
  }

  isVisible(): boolean {
    return this.status === PostStatus.PUBLISHED && 
           this.visibility !== PostVisibility.PRIVATE;
  }

  incrementLikeCount(): void {
    this.likeCount += 1;
  }

  decrementLikeCount(): void {
    if (this.likeCount > 0) {
      this.likeCount -= 1;
    }
  }

  incrementCommentCount(): void {
    this.commentCount += 1;
  }

  decrementCommentCount(): void {
    if (this.commentCount > 0) {
      this.commentCount -= 1;
    }
  }

  incrementViewCount(): void {
    this.viewCount += 1;
  }

  incrementShareCount(): void {
    this.shareCount = (this.shareCount || 0) + 1;
  }

  incrementBookmarkCount(): void {
    this.bookmarkCount = (this.bookmarkCount || 0) + 1;
  }

  decrementBookmarkCount(): void {
    if (this.bookmarkCount && this.bookmarkCount > 0) {
      this.bookmarkCount -= 1;
    }
  }

  // Computed properties
  get engagementRate(): number {
    if (this.viewCount === 0) return 0;
    const totalEngagement = this.likeCount + this.commentCount + (this.shareCount || 0);
    return (totalEngagement / this.viewCount) * 100;
  }

  get isRecent(): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt > oneDayAgo;
  }

  get isPopular(): boolean {
    return this.likeCount > 50 || this.commentCount > 20 || (this.shareCount || 0) > 10;
  }

  get readingTime(): number {
    if (!this.content) return 0;
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  get isEdited(): boolean {
    return this.metadata?.editHistory && this.metadata.editHistory.length > 0;
  }

  get totalReactions(): number {
    return this.likeCount + (this.dislikeCount || 0);
  }
}
