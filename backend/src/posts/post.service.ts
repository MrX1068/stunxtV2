import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Post, PostStatus, PostVisibility, PostType } from '../shared/entities/post.entity';
import { PostComment } from '../shared/entities/post-comment.entity';
import { PostReaction, ReactionType, ReactionTarget } from '../shared/entities/post-reaction.entity';
import { PostTag } from '../shared/entities/post-tag.entity';
import { PostMedia } from '../shared/entities/post-media.entity';
import { User } from '../shared/entities/user.entity';
import { Community, CommunityInteractionType } from '../shared/entities/community.entity';
import { CommunityMember, CommunityMemberRole, CommunityMemberStatus } from '../shared/entities/community-member.entity';
import { Space } from '../shared/entities/space.entity';
import { SpaceMember, SpaceMemberRole, SpaceMemberStatus } from '../shared/entities/space-member.entity';

export interface CreatePostInterface {
  title: string;
  content?: string;
  type: PostType;
  visibility?: PostVisibility;
  communityId?: string;
  spaceId?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  keywords?: string[];
  metaDescription?: string;
  allowComments?: boolean;
  allowReactions?: boolean;
  allowSharing?: boolean;
  isNsfw?: boolean;
  isSpoiler?: boolean;
  contentWarnings?: string[];
  scheduledFor?: Date;
  metadata?: any;
}

export interface UpdatePostInterface {
  title?: string;
  content?: string;
  visibility?: PostVisibility;
  category?: string;
  subcategory?: string;
  tags?: string[];
  keywords?: string[];
  metaDescription?: string;
  allowComments?: boolean;
  allowReactions?: boolean;
  allowSharing?: boolean;
  isNsfw?: boolean;
  isSpoiler?: boolean;
  contentWarnings?: string[];
  metadata?: any;
}

export interface PostSearchOptions {
  query?: string;
  type?: PostType;
  status?: PostStatus;
  visibility?: PostVisibility;
  communityId?: string;
  spaceId?: string;
  authorId?: string;
  category?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'engagementRate';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  includeComments?: boolean;
  includeReactions?: boolean;
  includeTags?: boolean;
  includeMedia?: boolean;
}

export interface PostFeedOptions {
  userId: string;
  feedType: 'following' | 'trending' | 'recent' | 'popular' | 'community' | 'space';
  communityId?: string;
  spaceId?: string;
  limit?: number;
  offset?: number;
  includeComments?: boolean;
  includeReactions?: boolean;
}

export interface UserPostsOptions {
  limit?: number;
  offset?: number;
  postType?: 'all' | 'personal' | 'community' | 'space';
  communityId?: string;
  spaceId?: string;
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostComment)
    private readonly commentRepository: Repository<PostComment>,
    @InjectRepository(PostReaction)
    private readonly reactionRepository: Repository<PostReaction>,
    @InjectRepository(PostTag)
    private readonly tagRepository: Repository<PostTag>,
    @InjectRepository(PostMedia)
    private readonly mediaRepository: Repository<PostMedia>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly communityMemberRepository: Repository<CommunityMember>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // Post creation with optimistic updates
  async createPost(userId: string, createPostDto: CreatePostInterface): Promise<Post> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate user exists
      const user = await this.getUserFromCache(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate community/space access if specified
      if (createPostDto.communityId) {
        await this.validateCommunityAccess(userId, createPostDto.communityId);
      }
      if (createPostDto.spaceId) {
        await this.validateSpaceAccess(userId, createPostDto.spaceId);
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(createPostDto.title);

      // Create post entity
      const post = this.postRepository.create({
        ...createPostDto,
        authorId: userId,
        slug,
        // Set communityId and spaceId if they are provided and valid
        communityId: createPostDto.communityId || null,
        spaceId: createPostDto.spaceId || null,
        status: createPostDto.scheduledFor ? PostStatus.DRAFT : PostStatus.PUBLISHED,
        publishedAt: createPostDto.scheduledFor ? null : new Date(),
        metadata: {
          ...createPostDto.metadata,
          mentions: this.extractMentions(createPostDto.content || ''),
          hashtags: this.extractHashtags(createPostDto.content || ''),
          qualityScore: await this.calculateQualityScore(createPostDto),
        },
      });

      // Save post
      const savedPost = await queryRunner.manager.save(Post, post) as Post;

      // Process tags
      if (createPostDto.tags && createPostDto.tags.length > 0) {
        await this.processTags(queryRunner, savedPost.id, createPostDto.tags);
      }

      await queryRunner.commitTransaction();

      // Get the complete post with all relations for return
      const completePost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.community', 'community')
        .leftJoinAndSelect('post.space', 'space')
        .leftJoinAndSelect('post.postTags', 'postTags')
        .where('post.id = :id', { id: savedPost.id })
        .getOne();

      // Emit event for background processing
      this.eventEmitter.emit('post.created', {
        postId: savedPost.id,
        authorId: userId,
        communityId: createPostDto.communityId,
        spaceId: createPostDto.spaceId,
        type: createPostDto.type,
        isOptimistic: true,
      });

      // Clear relevant caches
      await this.clearPostCaches(savedPost);

      return completePost || savedPost;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Get post with optimized queries and caching
  async getPost(postId: string, userId?: string): Promise<Post> {
    const cacheKey = `post:${postId}:${userId || 'public'}`;
    
    // Try cache first
    let post = await this.cacheManager.get<Post>(cacheKey);
    if (post) {
      return post;
    }

    // Query from database with all relations
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.comments', 'comments', 'comments.status = :status', { status: 'published' })
      .leftJoinAndSelect('comments.author', 'commentAuthor')
      .leftJoinAndSelect('post.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .leftJoinAndSelect('post.postTags', 'postTags')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' })
      .where('post.id = :postId', { postId });

    // Add visibility filters
    if (userId) {
      queryBuilder.andWhere(
        '(post.visibility = :public OR post.authorId = :userId OR ' +
        '(post.visibility = :communityOnly AND post.communityId IN ' +
        '(SELECT cm.community_id FROM community_members cm WHERE cm.user_id = :userId AND cm.status = \'active\')) OR ' +
        '(post.visibility = :spaceOnly AND post.spaceId IN ' +
        '(SELECT sm.space_id FROM space_members sm WHERE sm.user_id = :userId AND sm.status = \'active\')))',
        {
          public: PostVisibility.PUBLIC,
          communityOnly: PostVisibility.COMMUNITY_ONLY,
          spaceOnly: PostVisibility.SPACE_ONLY,
          userId,
        }
      );
    } else {
      queryBuilder.andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC });
    }

    post = await queryBuilder.getOne();
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count asynchronously
    this.incrementViewCount(postId);

    // Transform post to include user reaction state
    const transformedPost = this.transformPostWithUserReaction(post, userId);

    // Cache the result
    await this.cacheManager.set(cacheKey, transformedPost, 300); // 5 minutes

    return transformedPost;
  }

  // Get personalized feed with smart algorithm
  async getFeed(options: PostFeedOptions): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
    const { userId, feedType, limit = 20, offset = 0 } = options;
    
    const cacheKey = `feed:${userId}:${feedType}:${limit}:${offset}:${options.communityId || ''}:${options.spaceId || ''}`;
    
    // Try cache first for recent feeds
    if (offset === 0) {
      const cachedFeed = await this.cacheManager.get<{ posts: Post[]; total: number }>(cacheKey);
      if (cachedFeed) {
        return {
          ...cachedFeed,
          hasMore: cachedFeed.posts.length === limit,
        };
      }
    }

    let queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus AND media.order = 0', { mediaStatus: 'ready' })
      .where('post.status = :status', { status: PostStatus.PUBLISHED });

    // Apply feed type logic
    switch (feedType) {
      case 'following':
        queryBuilder = await this.applyFollowingFilter(queryBuilder, userId);
        break;
      case 'trending':
        queryBuilder = this.applyTrendingFilter(queryBuilder);
        break;
      case 'popular':
        queryBuilder = this.applyPopularFilter(queryBuilder);
        break;
      case 'community':
        if (!options.communityId) throw new BadRequestException('Community ID required for community feed');
        queryBuilder.andWhere('post.communityId = :communityId', { communityId: options.communityId });
        break;
      case 'space':
        if (!options.spaceId) throw new BadRequestException('Space ID required for space feed');
        queryBuilder.andWhere('post.spaceId = :spaceId', { spaceId: options.spaceId });
        break;
      case 'recent':
      default:
        queryBuilder.orderBy('post.createdAt', 'DESC');
        break;
    }

    // Apply visibility filters
    queryBuilder.andWhere(
      '(post.visibility = :public OR post.authorId = :userId OR ' +
      '(post.visibility = :communityOnly AND post.communityId IN ' +
      '(SELECT cm.community_id FROM community_members cm WHERE cm.user_id = :userId AND cm.status = \'active\')) OR ' +
      '(post.visibility = :spaceOnly AND post.spaceId IN ' +
      '(SELECT sm.space_id FROM space_members sm WHERE sm.user_id = :userId AND sm.status = \'active\')))',
      {
        public: PostVisibility.PUBLIC,
        communityOnly: PostVisibility.COMMUNITY_ONLY,
        spaceOnly: PostVisibility.SPACE_ONLY,
        userId,
      }
    );

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    const result = {
      posts,
      total,
      hasMore: posts.length === limit,
    };

    // Cache recent feeds only
    if (offset === 0 && ['recent', 'trending', 'popular'].includes(feedType)) {
      await this.cacheManager.set(cacheKey, { posts, total }, 180); // 3 minutes
    }

    return result;
  }

  // Add reaction with optimistic updates
  async addReaction(postId: string, userId: string, reactionType: ReactionType): Promise<PostReaction | null> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.allowReactions) {
      throw new ForbiddenException('Reactions are not allowed on this post');
    }

    // Check if user already reacted
    const existingReaction = await this.reactionRepository.findOne({
      where: { postId, userId, targetType: ReactionTarget.POST },
    });

    if (existingReaction) {
      // If same reaction type, remove it (toggle behavior)
      if (existingReaction.type === reactionType) {
        await this.reactionRepository.remove(existingReaction);

        // Update post like count
        if (reactionType === ReactionType.LIKE) {
          await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
        }

        // Emit event for real-time updates
        this.eventEmitter.emit('post.reaction.removed', {
          postId,
          userId,
          reactionType,
        });

        // Clear post cache
        await this.clearPostCache(postId);

        return null; // Indicate reaction was removed
      }

      // Different reaction type - update existing reaction
      const previousType = existingReaction.type;
      existingReaction.type = reactionType;
      existingReaction.metadata = {
        ...existingReaction.metadata,
        previousReaction: previousType,
      };

      const updatedReaction = await this.reactionRepository.save(existingReaction);

      // Update like counts for both old and new reaction types
      if (previousType === ReactionType.LIKE) {
        await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
      }
      if (reactionType === ReactionType.LIKE) {
        await this.postRepository.increment({ id: postId }, 'likeCount', 1);
      }

      // Emit event for real-time updates
      this.eventEmitter.emit('post.reaction.updated', {
        postId,
        userId,
        reactionType,
        previousType,
      });

      // Clear post cache
      await this.clearPostCache(postId);

      return updatedReaction;
    }

    // Create new reaction
    const reaction = this.reactionRepository.create({
      type: reactionType,
      targetType: ReactionTarget.POST,
      postId,
      userId,
      metadata: {
        source: 'web',
      },
    });

    const savedReaction = await this.reactionRepository.save(reaction);

    // Update post like count optimistically
    if (reactionType === ReactionType.LIKE) {
      await this.postRepository.increment({ id: postId }, 'likeCount', 1);
    }

    // Emit event for real-time updates
    this.eventEmitter.emit('post.reaction.added', {
      postId,
      userId,
      reactionType,
    });

    // Clear post cache
    await this.clearPostCache(postId);

    return savedReaction;
  }

  // Remove reaction from post
  async removeReaction(postId: string, userId: string, reactionType: ReactionType): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Find existing reaction
    const existingReaction = await this.reactionRepository.findOne({
      where: { postId, userId, targetType: ReactionTarget.POST, type: reactionType },
    });

    if (!existingReaction) {
      throw new NotFoundException('Reaction not found');
    }

    // Remove the reaction
    await this.reactionRepository.remove(existingReaction);

    // Update post like count
    if (reactionType === ReactionType.LIKE) {
      await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
    }

    // Emit event for real-time updates
    this.eventEmitter.emit('post.reaction.removed', {
      postId,
      userId,
      reactionType,
    });

    // Clear post cache
    await this.clearPostCache(postId);
  }

  // Add comment with threading support
  async addComment(postId: string, userId: string, content: string, parentId?: string): Promise<PostComment> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.allowComments) {
      throw new ForbiddenException('Comments are not allowed on this post');
    }

    // Validate parent comment if specified
    if (parentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentId, postId },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = this.commentRepository.create({
      content,
      postId,
      authorId: userId,
      parentId,
      metadata: {
        mentions: this.extractMentions(content),
        hashtags: this.extractHashtags(content),
      },
    });

    const savedComment = await this.commentRepository.save(comment);

    // Update post comment count
    await this.postRepository.increment({ id: postId }, 'commentCount', 1);

    // Update parent comment reply count if it's a reply
    if (parentId) {
      await this.commentRepository.increment({ id: parentId }, 'replyCount', 1);
    }

    // Emit event for real-time updates
    this.eventEmitter.emit('post.comment.added', {
      postId,
      commentId: savedComment.id,
      authorId: userId,
      parentId,
    });

    // Clear post cache
    await this.clearPostCache(postId);

    return savedComment;
  }

  // Search posts with advanced filters and full-text search
  async searchPosts(options: PostSearchOptions): Promise<{ posts: Post[]; total: number }> {
    let queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' });

    // Apply search query
    if (options.query) {
      queryBuilder.andWhere(
        '(post.title ILIKE :query OR post.content ILIKE :query OR post.keywords @> ARRAY[:queryTag])',
        { query: `%${options.query}%`, queryTag: options.query.toLowerCase() }
      );
    }

    // Apply filters
    if (options.type) {
      queryBuilder.andWhere('post.type = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('post.status = :status', { status: options.status });
    } else {
      queryBuilder.andWhere('post.status = :defaultStatus', { defaultStatus: PostStatus.PUBLISHED });
    }

    if (options.visibility) {
      queryBuilder.andWhere('post.visibility = :visibility', { visibility: options.visibility });
    }

    if (options.communityId) {
      queryBuilder.andWhere('post.communityId = :communityId', { communityId: options.communityId });
    }

    if (options.spaceId) {
      queryBuilder.andWhere('post.spaceId = :spaceId', { spaceId: options.spaceId });
    }

    if (options.authorId) {
      queryBuilder.andWhere('post.authorId = :authorId', { authorId: options.authorId });
    }

    if (options.category) {
      queryBuilder.andWhere('post.category = :category', { category: options.category });
    }

    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere('post.tags && :tags', { tags: options.tags });
    }

    if (options.dateFrom) {
      queryBuilder.andWhere('post.createdAt >= :dateFrom', { dateFrom: options.dateFrom });
    }

    if (options.dateTo) {
      queryBuilder.andWhere('post.createdAt <= :dateTo', { dateTo: options.dateTo });
    }

    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`post.${sortBy}`, sortOrder);

    // Apply pagination
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }
    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    const [posts, total] = await queryBuilder.getManyAndCount();

    return { posts, total };
  }

  // Get posts by user (for user profiles)
  async getUserPosts(
    targetUserId: string, 
    requestingUserId?: string, 
    options: UserPostsOptions = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const { limit = 20, offset = 0, postType = 'all' } = options;
    
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' })
      .where('post.authorId = :targetUserId', { targetUserId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

    // Apply post type filters
    switch (postType) {
      case 'personal':
        // Only personal posts (no community or space)
        queryBuilder.andWhere('post.communityId IS NULL AND post.spaceId IS NULL');
        break;
      case 'community':
        // Only community posts
        queryBuilder.andWhere('post.communityId IS NOT NULL');
        if (options.communityId) {
          queryBuilder.andWhere('post.communityId = :communityId', { communityId: options.communityId });
        }
        break;
      case 'space':
        // Only space posts
        queryBuilder.andWhere('post.spaceId IS NOT NULL');
        if (options.spaceId) {
          queryBuilder.andWhere('post.spaceId = :spaceId', { spaceId: options.spaceId });
        }
        break;
      case 'all':
      default:
        // All posts (personal + community + space)
        break;
    }

    // Apply visibility filters based on relationship
    if (requestingUserId === targetUserId) {
      // User viewing their own posts - show all
      queryBuilder.andWhere('post.visibility IN (:...visibilities)', {
        visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY, PostVisibility.PRIVATE],
      });
    } else if (requestingUserId) {
      // Check if requesting user follows the target user
      const isFollowing = await this.checkIfUserFollows(requestingUserId, targetUserId);
      
      if (isFollowing) {
        queryBuilder.andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY],
        });
      } else {
        queryBuilder.andWhere('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC });
      }
    } else {
      // Anonymous user - only public posts
      queryBuilder.andWhere('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC });
    }

    queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    return { posts, total };
  }

  // Get user post statistics for profile overview
  async getUserPostStats(
    targetUserId: string, 
    requestingUserId?: string
  ): Promise<{
    total: number;
    personal: number;
    community: number;
    space: number;
    communityBreakdown: Array<{ communityId: string; communityName: string; count: number }>;
    spaceBreakdown: Array<{ spaceId: string; spaceName: string; count: number }>;
  }> {
    const baseQuery = this.postRepository
      .createQueryBuilder('post')
      .where('post.authorId = :targetUserId', { targetUserId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

    // Apply visibility filters
    if (requestingUserId === targetUserId) {
      // User viewing their own posts - show all
      baseQuery.andWhere('post.visibility IN (:...visibilities)', {
        visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY, PostVisibility.PRIVATE],
      });
    } else if (requestingUserId) {
      // Check if requesting user follows the target user
      const isFollowing = await this.checkIfUserFollows(requestingUserId, targetUserId);
      
      if (isFollowing) {
        baseQuery.andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY],
        });
      } else {
        baseQuery.andWhere('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC });
      }
    } else {
      // Anonymous user - only public posts
      baseQuery.andWhere('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC });
    }

    // Get total count
    const total = await baseQuery.getCount();

    // Get personal posts count
    const personalCount = await baseQuery
      .clone()
      .andWhere('post.communityId IS NULL AND post.spaceId IS NULL')
      .getCount();

    // Get community posts count
    const communityCount = await baseQuery
      .clone()
      .andWhere('post.communityId IS NOT NULL')
      .getCount();

    // Get space posts count
    const spaceCount = await baseQuery
      .clone()
      .andWhere('post.spaceId IS NOT NULL')
      .getCount();

    // Get community breakdown
    const communityBreakdown = await baseQuery
      .clone()
      .leftJoinAndSelect('post.community', 'community')
      .andWhere('post.communityId IS NOT NULL')
      .select(['post.communityId', 'community.name', 'COUNT(post.id) as count'])
      .groupBy('post.communityId, community.name')
      .orderBy('count', 'DESC')
      .getRawMany()
      .then(results => results.map(r => ({
        communityId: r.post_communityId,
        communityName: r.community_name,
        count: parseInt(r.count)
      })));

    // Get space breakdown
    const spaceBreakdown = await baseQuery
      .clone()
      .leftJoinAndSelect('post.space', 'space')
      .andWhere('post.spaceId IS NOT NULL')
      .select(['post.spaceId', 'space.name', 'COUNT(post.id) as count'])
      .groupBy('post.spaceId, space.name')
      .orderBy('count', 'DESC')
      .getRawMany()
      .then(results => results.map(r => ({
        spaceId: r.post_spaceId,
        spaceName: r.space_name,
        count: parseInt(r.count)
      })));

    return {
      total,
      personal: personalCount,
      community: communityCount,
      space: spaceCount,
      communityBreakdown,
      spaceBreakdown,
    };
  }

  // Get posts for a specific community
  async getCommunityPosts(
    communityId: string,
    requestingUserId?: string,
    options: { limit?: number; offset?: number; sortBy?: string } = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const { limit = 20, offset = 0, sortBy = 'createdAt' } = options;
    
    // First check if user has access to the community
    if (requestingUserId) {
      await this.validateCommunityAccess(requestingUserId, communityId);
    }

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' })
      .where('post.communityId = :communityId', { communityId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

    // Apply visibility filters
    if (requestingUserId) {
      queryBuilder.andWhere(
        '(post.visibility = :public OR post.visibility = :communityOnly)',
        { public: PostVisibility.PUBLIC, communityOnly: PostVisibility.COMMUNITY_ONLY }
      );
    } else {
      queryBuilder.andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC });
    }

    // Apply sorting
    if (sortBy === 'popular') {
      queryBuilder.orderBy('(post.likeCount + post.commentCount * 2)', 'DESC');
    } else if (sortBy === 'trending') {
      queryBuilder
        .andWhere('post.createdAt > :trendingCutoff', { 
          trendingCutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        })
        .orderBy('(post.likeCount + post.commentCount * 2 + post.shareCount * 3)', 'DESC');
    } else {
      queryBuilder.orderBy('post.createdAt', 'DESC');
    }

    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    return { posts, total };
  }

  // Get posts for a specific space
  async getSpacePosts(
    spaceId: string,
    requestingUserId?: string,
    options: { limit?: number; offset?: number; sortBy?: string } = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const { limit = 20, offset = 0, sortBy = 'createdAt' } = options;
    
    // First check if user has access to the space
    if (requestingUserId) {
      await this.validateSpaceAccess(requestingUserId, spaceId);
    }

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' })
      .leftJoinAndSelect('post.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .where('post.spaceId = :spaceId', { spaceId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

    // Apply visibility filters
    if (requestingUserId) {
      queryBuilder.andWhere(
        '(post.visibility = :public OR post.visibility = :spaceOnly)',
        { public: PostVisibility.PUBLIC, spaceOnly: PostVisibility.SPACE_ONLY }
      );
    } else {
      queryBuilder.andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC });
    }

    // Apply sorting
    if (sortBy === 'popular') {
      queryBuilder.orderBy('(post.likeCount + post.commentCount * 2)', 'DESC');
    } else if (sortBy === 'trending') {
      queryBuilder
        .andWhere('post.createdAt > :trendingCutoff', { 
          trendingCutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        })
        .orderBy('(post.likeCount + post.commentCount * 2 + post.shareCount * 3)', 'DESC');
    } else {
      queryBuilder.orderBy('post.createdAt', 'DESC');
    }

    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    // Transform posts to include user reaction state
    const transformedPosts = posts.map(post => this.transformPostWithUserReaction(post, requestingUserId));

    return { posts: transformedPosts, total };
  }

  // Get posts from users that the current user follows
  async getFollowingPosts(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.community', 'community')
      .leftJoinAndSelect('post.space', 'space')
      .leftJoinAndSelect('post.media', 'media', 'media.status = :mediaStatus', { mediaStatus: 'ready' })
      .innerJoin('user_follows', 'uf', 'uf.following_id = post.authorId')
      .where('uf.follower_id = :userId', { userId })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.visibility IN (:...visibilities)', {
        visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY],
      })
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    return { posts, total };
  }

  // Helper methods
  private async getUserFromCache(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    let user = await this.cacheManager.get<User>(cacheKey);
    
    if (!user) {
      user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.cacheManager.set(cacheKey, user, 600); // 10 minutes
      }
    }
    
    return user;
  }

  private async checkIfUserFollows(followerId: string, followingId: string): Promise<boolean> {
    const cacheKey = `user:follows:${followerId}:${followingId}`;
    let isFollowing = await this.cacheManager.get<boolean>(cacheKey);
    
    if (isFollowing === undefined) {
      // Query the user_follows table
      const result = await this.dataSource.query(
        'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1',
        [followerId, followingId]
      );
      isFollowing = result.length > 0;
      
      // Cache the result for 5 minutes
      await this.cacheManager.set(cacheKey, isFollowing, 300);
    }
    
    return isFollowing;
  }

  private async validateCommunityAccess(userId: string, communityId: string): Promise<void> {
    // Get community details
    const community = await this.communityRepository.findOne({ 
      where: { id: communityId },
      select: ['id', 'ownerId', 'interactionType', 'type', 'status']
    });
    
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if community is active
    if (community.status !== 'active') {
      throw new ForbiddenException('Community is not active');
    }

    // Check if user is the owner
    if (community.ownerId === userId) {
      return; // Owner has full access
    }

    // Get user's membership status
    const membership = await this.communityMemberRepository.findOne({
      where: { 
        communityId, 
        userId,
        status: CommunityMemberStatus.ACTIVE 
      },
      select: ['role', 'status']
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this community');
    }

    // Check if user is banned/suspended
    if (membership.status === CommunityMemberStatus.BANNED || 
        membership.status === CommunityMemberStatus.SUSPENDED) {
      throw new ForbiddenException('You are banned or suspended from this community');
    }

    // Check posting permissions based on interaction type
    if (community.interactionType === CommunityInteractionType.POST) {
      // For POST-only communities, check if user has posting permissions
      if (membership.role === CommunityMemberRole.RESTRICTED) {
        throw new ForbiddenException('You do not have permission to post in this community');
      }
    } else if (community.interactionType === CommunityInteractionType.CHAT) {
      // For CHAT-only communities, posts are not allowed
      throw new ForbiddenException('This community only supports chat interactions, not posts');
    }
    // HYBRID communities allow both posts and chat for all active members
  }

  private async validateSpaceAccess(userId: string, spaceId: string): Promise<void> {
    // Get space details
    const space = await this.spaceRepository.findOne({ 
      where: { id: spaceId },
      select: ['id', 'ownerId', 'type', 'status', 'communityId']
    });
    
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if space is active
    if (space.status !== 'active') {
      throw new ForbiddenException('Space is not active');
    }

    // Check if user is the owner
    if (space.ownerId === userId) {
      return; // Owner has full access
    }

    // Get user's membership status in the space
    const spaceMembership = await this.spaceMemberRepository.findOne({
      where: { 
        spaceId, 
        userId,
        status: SpaceMemberStatus.ACTIVE 
      },
      select: ['role', 'status']
    });

    if (!spaceMembership) {
      throw new ForbiddenException('You are not a member of this space');
    }

    // Check if user is banned/suspended
    if (spaceMembership.status === SpaceMemberStatus.BANNED || 
        spaceMembership.status === SpaceMemberStatus.SUSPENDED) {
      throw new ForbiddenException('You are banned or suspended from this space');
    }

    // Check posting permissions
    if (spaceMembership.role === SpaceMemberRole.GUEST) {
      throw new ForbiddenException('Guests do not have permission to post in this space');
    }

    // Also validate community access if space belongs to a community
    if (space.communityId) {
      await this.validateCommunityAccess(userId, space.communityId);
    }
  }

  /**
   * Transform post to include user reaction state
   */
  private transformPostWithUserReaction(post: Post, userId?: string): any {
    if (!userId || !post.reactions) {
      return post;
    }

    // Find user's reaction for this post
    const userReaction = post.reactions.find(
      reaction => reaction.userId === userId && reaction.targetType === ReactionTarget.POST
    );

    // Add userReaction field to the post object
    return {
      ...post,
      userReaction: userReaction?.type || null,
    };
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (await this.postRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }

    return [...new Set(hashtags)]; // Remove duplicates
  }

  private async calculateQualityScore(createPostDto: CreatePostInterface): Promise<number> {
    let score = 0;

    // Title quality (max 20 points)
    if (createPostDto.title && createPostDto.title.length > 10) score += 10;
    if (createPostDto.title && createPostDto.title.length > 30) score += 10;

    // Content quality (max 30 points)
    if (createPostDto.content && createPostDto.content.length > 100) score += 15;
    if (createPostDto.content && createPostDto.content.length > 500) score += 15;

    // Metadata quality (max 30 points)
    if (createPostDto.metaDescription) score += 10;
    if (createPostDto.tags && createPostDto.tags.length > 0) score += 10;
    if (createPostDto.keywords && createPostDto.keywords.length > 0) score += 10;

    // Type-specific bonuses (max 20 points)
    if (createPostDto.type === PostType.VIDEO || createPostDto.type === PostType.IMAGE) score += 10;
    if (createPostDto.category) score += 10;

    return Math.min(score, 100); // Cap at 100
  }

  private async processTags(queryRunner: any, postId: string, tags: string[]): Promise<void> {
    for (const tagName of tags) {
      const tag = this.tagRepository.create({
        postId,
        tagName: tagName.toLowerCase().trim(),
        tagCategory: 'general',
      });
      await queryRunner.manager.save(PostTag, tag);
    }
  }

  private async applyFollowingFilter(queryBuilder: SelectQueryBuilder<Post>, userId: string): Promise<SelectQueryBuilder<Post>> {
    return queryBuilder
      .andWhere('post.authorId IN (SELECT following_id FROM user_follows WHERE follower_id = :userId)', { userId })
      .orderBy('post.createdAt', 'DESC');
  }

  private applyTrendingFilter(queryBuilder: SelectQueryBuilder<Post>): SelectQueryBuilder<Post> {
    return queryBuilder
      .andWhere('post.createdAt > :trendingCutoff', { trendingCutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .orderBy('(post.likeCount + post.commentCount * 2 + post.shareCount * 3)', 'DESC')
      .addOrderBy('post.createdAt', 'DESC');
  }

  private applyPopularFilter(queryBuilder: SelectQueryBuilder<Post>): SelectQueryBuilder<Post> {
    return queryBuilder
      .orderBy('post.likeCount', 'DESC')
      .addOrderBy('post.commentCount', 'DESC')
      .addOrderBy('post.viewCount', 'DESC');
  }

  private async incrementViewCount(postId: string): Promise<void> {
    // Use background task to avoid blocking the response
    setTimeout(async () => {
      try {
        await this.postRepository.increment({ id: postId }, 'viewCount', 1);
        await this.clearPostCache(postId);
      } catch (error) {
        // Log error but don't throw
        console.error('Failed to increment view count:', error);
      }
    }, 100);
  }

  private async clearPostCache(postId: string): Promise<void> {
    const keys = [
      `post:${postId}:*`,
      'feed:*',
    ];
    
    for (const keyPattern of keys) {
      // Clear all post caches using modern cache-manager 7.x approach
      try {
        await this.cacheManager.del(keyPattern);
      } catch (error) {
        // Silently handle cache deletion errors in v7.x
      }
    }
  }

  private async clearPostCaches(post: Post): Promise<void> {
    await this.clearPostCache(post.id);
    
    // Clear additional caches based on post context using modern cache-manager 7.x
    try {
      if (post.communityId) {
        await this.cacheManager.del(`community:${post.communityId}:posts:*`);
      }
      if (post.spaceId) {
        await this.cacheManager.del(`space:${post.spaceId}:posts:*`);
      }
    } catch (error) {
      // Silently handle cache deletion errors in v7.x
    }
  }
}
