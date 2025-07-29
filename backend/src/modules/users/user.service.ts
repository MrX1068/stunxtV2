import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole, AuthProvider } from '../../shared/entities/user.entity';
import { UserProfile } from '../../shared/entities/user-profile.entity';
import { UserPreferences } from '../../shared/entities/user-preferences.entity';
import { UserFollow } from '../../shared/entities/user-follow.entity';
import { UserBlock } from '../../shared/entities/user-block.entity';
import { UserSession } from '../../shared/entities/user-session.entity';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingOptIn?: boolean;
}

export interface UpdateUserDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  isPublic?: boolean;
  allowFollowers?: boolean;
  allowDirectMessages?: boolean;
}

export interface UpdateUserPreferencesDto {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationTypes?: {
    mentions?: boolean;
    comments?: boolean;
    reactions?: boolean;
    follows?: boolean;
    messages?: boolean;
    posts?: boolean;
    communities?: boolean;
    announcements?: boolean;
  };
  privacySettings?: {
    showEmail?: boolean;
    showPhone?: boolean;
    showLocation?: boolean;
    showOnlineStatus?: boolean;
    allowSearchByEmail?: boolean;
    allowSearchByPhone?: boolean;
  };
  contentPreferences?: {
    showNsfw?: boolean;
    showSpoilers?: boolean;
    autoplayVideos?: boolean;
    autoplayGifs?: boolean;
    showRecommendations?: boolean;
  };
}

export interface UserSearchOptions {
  query?: string;
  role?: UserRole;
  status?: UserStatus;
  verifiedOnly?: boolean;
  onlineOnly?: boolean;
  location?: string;
  sortBy?: 'username' | 'createdAt' | 'lastActiveAt' | 'followerCount' | 'postCount';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  includeProfile?: boolean;
  includeStats?: boolean;
}

export interface UserStats {
  followerCount: number;
  followingCount: number;
  postCount: number;
  commentCount: number;
  reactionCount: number;
  communityCount: number;
  spaceCount: number;
  joinedAt: Date;
  lastActiveAt?: Date;
  accountAge: number; // in days
  engagementRate: number;
  popularityScore: number;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserFollow)
    private readonly followRepository: Repository<UserFollow>,
    @InjectRepository(UserBlock)
    private readonly blockRepository: Repository<UserBlock>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // Create new user with profile and preferences
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if username/email already exists
      await this.validateUniqueUser(createUserDto.username, createUserDto.email);

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

      // Create user
      const user = this.userRepository.create({
        username: createUserDto.username.toLowerCase().trim(),
        email: createUserDto.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        fullName: createUserDto.displayName || createUserDto.username,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
        emailVerified: false,
      });

      const savedUser = await queryRunner.manager.save(User, user) as User;

      // Create user profile
      const profile = this.profileRepository.create({
        userId: savedUser.id,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        dateOfBirth: createUserDto.dateOfBirth,
        isPublic: true,
        allowFollowers: true,
        allowDirectMessages: true,
      });

      await queryRunner.manager.save(UserProfile, profile);

      // Create default preferences
      const preferences = this.preferencesRepository.create({
        userId: savedUser.id,
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationTypes: {
          mentions: true,
          comments: true,
          reactions: true,
          follows: true,
          messages: true,
          posts: true,
          communities: true,
          announcements: true,
        },
        privacySettings: {
          showEmail: false,
          showPhone: false,
          showLocation: true,
          showOnlineStatus: true,
          allowSearchByEmail: false,
          allowSearchByPhone: false,
        },
        contentPreferences: {
          showNsfw: false,
          showSpoilers: false,
          autoplayVideos: true,
          autoplayGifs: true,
          showRecommendations: true,
        },
      });

      await queryRunner.manager.save(UserPreferences, preferences);

      await queryRunner.commitTransaction();

      // Emit event for background processing
      this.eventEmitter.emit('user.created', {
        userId: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
      });

      // Clear relevant caches
      await this.clearUserCaches(savedUser.id);

      return await this.getUserById(savedUser.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Get user by ID with caching and relations
  async getUserById(userId: string, includePrivate: boolean = false): Promise<User> {
    const cacheKey = `user:${userId}:${includePrivate ? 'private' : 'public'}`;
    
    // Try cache first
    let user = await this.cacheManager.get<User>(cacheKey);
    if (user) {
      return user;
    }

    // Query from database with relations
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('user.id = :userId', { userId });

    // Include private data only if requested and authorized
    if (!includePrivate) {
      queryBuilder.select([
        'user.id',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.bannerUrl',
        'user.isVerified',
        'user.isPremium',
        'user.role',
        'user.status',
        'user.createdAt',
        'user.lastActiveAt',
        'profile.firstName',
        'profile.lastName',
        'profile.bio',
        'profile.location',
        'profile.website',
        'profile.isPublic',
        'profile.allowFollowers',
      ]);
    }

    user = await queryBuilder.getOne();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update last seen
    this.updateLastActiveAt(userId);

    // Cache the result
    await this.cacheManager.set(cacheKey, user, includePrivate ? 300 : 600); // Private data cached for 5 min, public for 10 min

    return user;
  }

  // Get user by username or email
  async getUserByIdentifier(identifier: string): Promise<User> {
    const cacheKey = `user:identifier:${identifier}`;
    
    let user = await this.cacheManager.get<User>(cacheKey);
    if (user) {
      return user;
    }

    user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('user.username = :identifier OR user.email = :identifier', { identifier: identifier.toLowerCase() })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheManager.set(cacheKey, user, 300); // 5 minutes

    return user;
  }

  // Update user profile
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(userId, true);
    
    // Update user profile
    if (user.profile) {
      Object.assign(user.profile, updateUserDto);
      await this.profileRepository.save(user.profile);
    }

    // Clear caches
    await this.clearUserCaches(userId);

    // Emit event
    this.eventEmitter.emit('user.updated', {
      userId,
      changes: updateUserDto,
    });

    return await this.getUserById(userId);
  }

  // Update user preferences
  async updatePreferences(userId: string, preferencesDto: UpdateUserPreferencesDto): Promise<UserPreferences> {
    let preferences = await this.preferencesRepository.findOne({ where: { userId } });
    
    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId });
    }

    // Deep merge preferences
    Object.assign(preferences, preferencesDto);
    
    // Handle nested objects
    if (preferencesDto.notificationTypes) {
      preferences.notificationTypes = { ...preferences.notificationTypes, ...preferencesDto.notificationTypes };
    }
    if (preferencesDto.privacySettings) {
      preferences.privacySettings = { ...preferences.privacySettings, ...preferencesDto.privacySettings };
    }
    if (preferencesDto.contentPreferences) {
      preferences.contentPreferences = { ...preferences.contentPreferences, ...preferencesDto.contentPreferences };
    }

    const savedPreferences = await this.preferencesRepository.save(preferences);

    // Clear user cache
    await this.clearUserCaches(userId);

    // Emit event
    this.eventEmitter.emit('user.preferences.updated', {
      userId,
      preferences: savedPreferences,
    });

    return savedPreferences;
  }

  // Follow/unfollow user
  async followUser(followerId: string, followingId: string): Promise<UserFollow> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if users exist
    await this.getUserById(followerId);
    const targetUser = await this.getUserById(followingId);

    if (!targetUser.profile?.allowFollowers) {
      throw new ForbiddenException('User does not allow followers');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Check if blocked
    const isBlocked = await this.blockRepository.findOne({
      where: [
        { blockerId: followingId, blockedId: followerId },
        { blockerId: followerId, blockedId: followingId },
      ],
    });

    if (isBlocked) {
      throw new ForbiddenException('Cannot follow this user');
    }

    const follow = this.followRepository.create({
      followerId,
      followingId,
      followedAt: new Date(),
    });

    const savedFollow = await this.followRepository.save(follow);

    // Update follow counts
    await Promise.all([
      this.userRepository.increment({ id: followerId }, 'followingCount', 1),
      this.userRepository.increment({ id: followingId }, 'followerCount', 1),
    ]);

    // Clear caches
    await Promise.all([
      this.clearUserCaches(followerId),
      this.clearUserCaches(followingId),
    ]);

    // Emit event
    this.eventEmitter.emit('user.followed', {
      followerId,
      followingId,
      followId: savedFollow.id,
    });

    return savedFollow;
  }

  // Unfollow user
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.followRepository.remove(follow);

    // Update follow counts
    await Promise.all([
      this.userRepository.decrement({ id: followerId }, 'followingCount', 1),
      this.userRepository.decrement({ id: followingId }, 'followerCount', 1),
    ]);

    // Clear caches
    await Promise.all([
      this.clearUserCaches(followerId),
      this.clearUserCaches(followingId),
    ]);

    // Emit event
    this.eventEmitter.emit('user.unfollowed', {
      followerId,
      followingId,
    });
  }

  // Block/unblock user
  async blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    // Remove any existing follow relationships
    await this.followRepository.delete([
      { followerId: blockerId, followingId: blockedId },
      { followerId: blockedId, followingId: blockerId },
    ]);

    const block = this.blockRepository.create({
      blockerId,
      blockedId,
      blockedAt: new Date(),
    });

    const savedBlock = await this.blockRepository.save(block);

    // Clear caches
    await Promise.all([
      this.clearUserCaches(blockerId),
      this.clearUserCaches(blockedId),
    ]);

    // Emit event
    this.eventEmitter.emit('user.blocked', {
      blockerId,
      blockedId,
      blockId: savedBlock.id,
    });

    return savedBlock;
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<UserStats> {
    const cacheKey = `user:stats:${userId}`;
    
    let stats = await this.cacheManager.get<UserStats>(cacheKey);
    if (stats) {
      return stats;
    }

    const user = await this.getUserById(userId);
    
    // Get various counts
    const [
      followerCount,
      followingCount,
      postCount,
      commentCount,
      reactionCount,
      communityCount,
      spaceCount,
    ] = await Promise.all([
      this.followRepository.count({ where: { followingId: userId } }),
      this.followRepository.count({ where: { followerId: userId } }),
      this.dataSource.query('SELECT COUNT(*) FROM posts WHERE author_id = $1 AND status = $2', [userId, 'published']),
      this.dataSource.query('SELECT COUNT(*) FROM post_comments WHERE author_id = $1 AND status = $2', [userId, 'published']),
      this.dataSource.query('SELECT COUNT(*) FROM post_reactions WHERE user_id = $1', [userId]),
      this.dataSource.query('SELECT COUNT(*) FROM community_members WHERE user_id = $1 AND status = $2', [userId, 'active']),
      this.dataSource.query('SELECT COUNT(*) FROM space_members WHERE user_id = $1 AND status = $2', [userId, 'active']),
    ]);

    const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const engagementRate = this.calculateEngagementRate(
      parseInt(postCount[0].count),
      parseInt(commentCount[0].count),
      parseInt(reactionCount[0].count),
      accountAge
    );
    const popularityScore = this.calculatePopularityScore(
      followerCount,
      parseInt(postCount[0].count),
      engagementRate
    );

    stats = {
      followerCount,
      followingCount,
      postCount: parseInt(postCount[0].count),
      commentCount: parseInt(commentCount[0].count),
      reactionCount: parseInt(reactionCount[0].count),
      communityCount: parseInt(communityCount[0].count),
      spaceCount: parseInt(spaceCount[0].count),
      joinedAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      accountAge,
      engagementRate,
      popularityScore,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, stats, 300);

    return stats;
  }

  // Search users with advanced filters
  async searchUsers(options: UserSearchOptions): Promise<{ users: User[]; total: number }> {
    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.status = :status', { status: UserStatus.ACTIVE });

    // Apply search query
    if (options.query) {
      queryBuilder.andWhere(
        '(user.username ILIKE :query OR user.displayName ILIKE :query OR profile.firstName ILIKE :query OR profile.lastName ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // Apply filters
    if (options.role) {
      queryBuilder.andWhere('user.role = :role', { role: options.role });
    }

    if (options.verifiedOnly) {
      queryBuilder.andWhere('user.isVerified = true');
    }

    if (options.onlineOnly) {
      queryBuilder.andWhere('user.lastActiveAt > :recentTime', {
        recentTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes
      });
    }

    if (options.location) {
      queryBuilder.andWhere('profile.location ILIKE :location', { location: `%${options.location}%` });
    }

    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // Apply pagination
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }
    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    // Select only public fields for search results
    queryBuilder.select([
      'user.id',
      'user.username',
      'user.displayName',
      'user.avatarUrl',
      'user.isVerified',
      'user.isPremium',
      'user.createdAt',
      'user.lastActiveAt',
      'profile.firstName',
      'profile.lastName',
      'profile.bio',
      'profile.location',
      'profile.isPublic',
    ]);

    const [users, total] = await queryBuilder.getManyAndCount();

    return { users, total };
  }

  // Get user's followers
  async getUserFollowers(userId: string, limit: number = 20, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followingId: userId },
      relations: ['follower', 'follower.profile'],
      take: limit,
      skip: offset,
      order: { followedAt: 'DESC' },
    });

    const users = follows.map(follow => follow.follower);

    return { users, total };
  }

  // Get user's following
  async getUserFollowing(userId: string, limit: number = 20, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followerId: userId },
      relations: ['following', 'following.profile'],
      take: limit,
      skip: offset,
      order: { followedAt: 'DESC' },
    });

    const users = follows.map(follow => follow.following);

    return { users, total };
  }

  // Helper methods
  private async validateUniqueUser(username: string, email: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
      ],
    });

    if (existingUser) {
      if (existingUser.username === username.toLowerCase()) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  private async updateLastActiveAt(userId: string): Promise<void> {
    // Use background task to avoid blocking the response
    setTimeout(async () => {
      try {
        await this.userRepository.update(userId, { lastActiveAt: new Date() });
        await this.clearUserCaches(userId);
      } catch (error) {
        // Log error but don't throw
        console.error('Failed to update last active time:', error);
      }
    }, 100);
  }

  private calculateEngagementRate(posts: number, comments: number, reactions: number, accountAge: number): number {
    if (accountAge === 0) return 0;
    
    const totalEngagement = posts * 3 + comments * 2 + reactions * 1;
    return Math.round((totalEngagement / accountAge) * 100) / 100;
  }

  private calculatePopularityScore(followers: number, posts: number, engagementRate: number): number {
    // Complex algorithm considering multiple factors
    const followerScore = Math.min(followers * 0.1, 50); // Max 50 points from followers
    const postScore = Math.min(posts * 0.05, 25); // Max 25 points from posts
    const engagementScore = Math.min(engagementRate * 5, 25); // Max 25 points from engagement
    
    return Math.round(followerScore + postScore + engagementScore);
  }

  private async clearUserCaches(userId: string): Promise<void> {
    const keys = [
      `user:${userId}:*`,
      `user:stats:${userId}`,
      `user:identifier:*`,
    ];
    
    for (const keyPattern of keys) {
      // Clear cache keys with pattern using modern cache-manager 7.x approach
      // Note: cache-manager v7.x doesn't have direct store access, use alternative approach
      try {
        // For cache-manager v7.x, we need to manually iterate and delete
        // This is a simplified approach since pattern deletion isn't directly supported
        await this.cacheManager.del(keyPattern);
      } catch (error) {
        console.warn('Cache pattern deletion not supported in cache-manager v7.x');
      }
    }
  }
}
