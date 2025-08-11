import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { PostService, PostSearchOptions, PostFeedOptions, UserPostsOptions } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ReactionType } from '../shared/entities/post-reaction.entity';
import { PostType, PostVisibility, PostStatus } from '../shared/entities/post.entity';
import { UserRole } from '../shared/entities/user.entity';

@ApiTags('Posts')
@Controller('posts')
@UsePipes(new ValidationPipe({ transform: true }))
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'post-uuid',
          title: 'My Amazing Post',
          content: 'This is the content...',
          status: 'published',
          slug: 'my-amazing-post',
          engagementRate: 0,
          isRecent: true,
          readingTime: 2,
        },
        message: 'Post created successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid post data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - No access to community/space' })
  async createPost(@Request() req: any, @Body() createPostDto: CreatePostDto) {
    try {
      const post = await this.postService.createPost(req.user.id, createPostDto);
      
      return {
        success: true,
        data: post,
        message: 'Post created successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized post feed' })
  @ApiQuery({ name: 'type', enum: ['following', 'trending', 'recent', 'popular', 'community', 'space'], required: false })
  @ApiQuery({ name: 'communityId', required: false })
  @ApiQuery({ name: 'spaceId', required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Feed retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          posts: [],
          total: 150,
          hasMore: true,
          currentPage: 1,
          totalPages: 8,
        },
        message: 'Feed retrieved successfully',
      },
    },
  })
  async getFeed(
    @Request() req: any,
    @Query('type') feedType: 'following' | 'trending' | 'recent' | 'popular' | 'community' | 'space' = 'recent',
    @Query('communityId') communityId?: string,
    @Query('spaceId') spaceId?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const options: PostFeedOptions = {
      userId: req.user.id,
      feedType,
      communityId,
      spaceId,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
      includeComments: true,
      includeReactions: true,
    };

    const result = await this.postService.getFeed(options);
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
      },
      message: 'Feed retrieved successfully',
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts with advanced filters' })
  @ApiQuery({ name: 'query', required: false, description: 'Search term' })
  @ApiQuery({ name: 'type', enum: PostType, required: false })
  @ApiQuery({ name: 'communityId', required: false })
  @ApiQuery({ name: 'spaceId', required: false })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'sortBy', enum: ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'commentCount'], required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchPosts(
    @Query('query') query?: string,
    @Query('type') type?: PostType,
    @Query('communityId') communityId?: string,
    @Query('spaceId') spaceId?: string,
    @Query('authorId') authorId?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const searchOptions: PostSearchOptions = {
      query,
      type,
      communityId,
      spaceId,
      authorId,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'DESC',
      limit: Math.min(limit, 100),
      offset,
      includeComments: true,
      includeReactions: true,
      includeTags: true,
      includeMedia: true,
    };

    const result = await this.postService.searchPosts(searchOptions);
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
        filters: searchOptions,
      },
      message: 'Search completed successfully',
    };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending posts' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'timeframe', enum: ['1h', '6h', '24h', '7d'], required: false, example: '24h' })
  @ApiResponse({ status: 200, description: 'Trending posts retrieved successfully' })
  async getTrendingPosts(
    @Query('limit') limit: number = 10,
    @Query('timeframe') timeframe: '1h' | '6h' | '24h' | '7d' = '24h',
  ) {
    const timeframeHours = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
    };

    const dateFrom = new Date(Date.now() - timeframeHours[timeframe] * 60 * 60 * 1000);

    const searchOptions: PostSearchOptions = {
      dateFrom,
      sortBy: 'likeCount',
      sortOrder: 'DESC',
      limit: Math.min(limit, 50),
      offset: 0,
      includeComments: true,
      includeReactions: true,
      includeMedia: true,
    };

    const result = await this.postService.searchPosts(searchOptions);
    
    return {
      success: true,
      data: result.posts,
      message: `Trending posts for ${timeframe} retrieved successfully`,
      metadata: {
        timeframe,
        total: result.total,
      },
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiQuery({ 
    name: 'postType', 
    enum: ['all', 'personal', 'community', 'space'], 
    required: false,
    description: 'Filter posts by type',
    example: 'all'
  })
  @ApiQuery({ 
    name: 'communityId', 
    type: String, 
    required: false,
    description: 'Filter posts from specific community (use with postType=community)'
  })
  @ApiQuery({ 
    name: 'spaceId', 
    type: String, 
    required: false,
    description: 'Filter posts from specific space (use with postType=space)'
  })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          posts: [],
          total: 0,
          currentPage: 1,
          totalPages: 0,
        },
        message: 'User posts retrieved successfully',
      },
    },
  })
  async getUserPosts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('postType') postType: 'all' | 'personal' | 'community' | 'space' = 'all',
    @Query('communityId') communityId?: string,
    @Query('spaceId') spaceId?: string,
  ) {
    const requestingUserId = req.user?.id;
    const result = await this.postService.getUserPosts(
      userId, 
      requestingUserId, 
      { limit, offset, postType, communityId, spaceId }
    );
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
      },
      message: 'User posts retrieved successfully',
    };
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Get user post statistics for profile overview' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User post statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          total: 45,
          personal: 20,
          community: 15,
          space: 10,
          communityBreakdown: [
            { communityId: 'uuid', communityName: 'Tech Discussions', count: 8 },
            { communityId: 'uuid', communityName: 'JavaScript Developers', count: 7 }
          ],
          spaceBreakdown: [
            { spaceId: 'uuid', spaceName: 'Project Alpha', count: 6 },
            { spaceId: 'uuid', spaceName: 'Team Beta', count: 4 }
          ]
        },
        message: 'User post statistics retrieved successfully',
      },
    },
  })
  async getUserPostStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    const requestingUserId = req.user?.id;
    const stats = await this.postService.getUserPostStats(userId, requestingUserId);
    
    return {
      success: true,
      data: stats,
      message: 'User post statistics retrieved successfully',
    };
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Get posts for a community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiQuery({ name: 'sortBy', enum: ['createdAt', 'popular', 'trending'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Community posts retrieved successfully',
  })
  async getCommunityPosts(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('sortBy') sortBy: string = 'createdAt',
  ) {
    const requestingUserId = req.user?.id;
    const result = await this.postService.getCommunityPosts(communityId, requestingUserId, { 
      limit, 
      offset, 
      sortBy 
    });
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
      },
      message: 'Community posts retrieved successfully',
    };
  }

  @Get('space/:spaceId')
  @ApiOperation({ summary: 'Get posts for a space' })
  @ApiParam({ name: 'spaceId', description: 'Space ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiQuery({ name: 'sortBy', enum: ['createdAt', 'popular', 'trending'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Space posts retrieved successfully',
  })
  async getSpacePosts(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('sortBy') sortBy: string = 'createdAt',
  ) {
    const requestingUserId = req.user?.id;
    const result = await this.postService.getSpacePosts(spaceId, requestingUserId, { 
      limit, 
      offset, 
      sortBy 
    });
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
      },
      message: 'Space posts retrieved successfully',
    };
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get posts from followed users' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Following posts retrieved successfully',
  })
  async getFollowingPosts(
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.postService.getFollowingPosts(req.user.id, { limit, offset });
    
    return {
      success: true,
      data: {
        ...result,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit),
      },
      message: 'Following posts retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific post by ID' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'post-uuid',
          title: 'My Amazing Post',
          content: 'This is the content...',
          author: { id: 'user-uuid', username: 'johndoe' },
          community: { id: 'comm-uuid', name: 'Tech Talk' },
          comments: [],
          reactions: [],
          media: [],
          engagementRate: 15.5,
          readingTime: 3,
        },
        message: 'Post retrieved successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req?.user?.id;
    const post = await this.postService.getPost(id, userId);
    
    return {
      success: true,
      data: post,
      message: 'Post retrieved successfully',
    };
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add or update reaction to a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiBody({ type: AddReactionDto })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Reactions not allowed on this post' })
  async addReaction(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
    @Body() addReactionDto: AddReactionDto,
  ) {
    const reaction = await this.postService.addReaction(
      postId,
      req.user.id,
      addReactionDto.type,
    );

    return {
      success: true,
      data: reaction,
      message: reaction ? 'Reaction added successfully' : 'Reaction removed successfully',
    };
  }

  @Delete(':id/reactions/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove reaction from a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiParam({ name: 'type', description: 'Reaction type to remove' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @ApiResponse({ status: 404, description: 'Post or reaction not found' })
  async removeReaction(
    @Param('id', ParseUUIDPipe) postId: string,
    @Param('type') reactionType: ReactionType,
    @Request() req: any,
  ) {
    await this.postService.removeReaction(
      postId,
      req.user.id,
      reactionType,
    );

    return {
      success: true,
      message: 'Reaction removed successfully',
    };
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiBody({ type: AddCommentDto })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Comments not allowed on this post' })
  async addComment(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
    @Body() addCommentDto: AddCommentDto,
  ) {
    const comment = await this.postService.addComment(
      postId,
      req.user.id,
      addCommentDto.content,
      addCommentDto.parentId,
    );
    
    return {
      success: true,
      data: comment,
      message: 'Comment added successfully',
    };
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media files to a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async uploadMedia(
    @Param('id', ParseUUIDPipe) postId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    // This would integrate with a file upload service
    // For now, return a placeholder response
    
    return {
      success: true,
      data: {
        postId,
        uploadedFiles: files.length,
        files: files.map(file => ({
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        })),
      },
      message: 'Media upload initiated successfully',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this post' })
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    // Implementation would include authorization check and update logic
    
    return {
      success: true,
      data: { id, ...updatePostDto },
      message: 'Post updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this post' })
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    // Implementation would include authorization check and soft delete
    
    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post analytics (Admin/Moderator only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post analytics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          views: 1250,
          uniqueViews: 892,
          likes: 145,
          comments: 23,
          shares: 12,
          engagementRate: 14.4,
          averageReadTime: 180,
          topReferrers: ['direct', 'google', 'facebook'],
          demographics: {
            countries: [{ name: 'US', count: 450 }],
            devices: [{ type: 'mobile', count: 750 }],
          },
        },
        message: 'Analytics retrieved successfully',
      },
    },
  })
  async getPostAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    // Placeholder for analytics implementation
    return {
      success: true,
      data: {
        views: 1250,
        uniqueViews: 892,
        likes: 145,
        comments: 23,
        shares: 12,
        engagementRate: 14.4,
        averageReadTime: 180,
        topReferrers: ['direct', 'google', 'facebook'],
        demographics: {
          countries: [{ name: 'US', count: 450 }],
          devices: [{ type: 'mobile', count: 750 }],
        },
      },
      message: 'Analytics retrieved successfully',
    };
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pin/unpin a post (Admin/Moderator only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post pin status updated successfully' })
  async togglePin(@Param('id', ParseUUIDPipe) id: string) {
    // Implementation would toggle the isPinned status
    
    return {
      success: true,
      data: { id, isPinned: true },
      message: 'Post pinned successfully',
    };
  }

  @Post(':id/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Feature/unfeature a post (Admin only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post feature status updated successfully' })
  async toggleFeature(@Param('id', ParseUUIDPipe) id: string) {
    // Implementation would toggle the isFeatured status
    
    return {
      success: true,
      data: { id, isFeatured: true },
      message: 'Post featured successfully',
    };
  }
}
