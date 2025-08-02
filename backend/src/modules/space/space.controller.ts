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
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceAccessGuard, SpaceContentAccess } from './guards/space-access.guard';
import { SpaceService } from './space.service';
import { SpaceMemberService } from './space-member.service';
import { 
  CreateSpaceDto, 
  UpdateSpaceDto, 
  SpaceQueryDto,
  JoinSpaceDto,
  UpdateSpaceMemberRoleDto,
  BanSpaceMemberDto,
  TransferSpaceOwnershipDto
} from './dto/space.dto';
import { SpaceMemberRole } from '../../shared/entities/space-member.entity';

@ApiTags('Spaces')
@Controller('communities/:communityId/spaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SpaceController {
  // Fixed content endpoints
  constructor(
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
  ) {
    console.log('🚀 [SpaceController] Controller initialized with content endpoints');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new space in community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiResponse({ status: 201, description: 'Space created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Space name already exists' })
  async createSpace(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() createSpaceDto: CreateSpaceDto,
    @Request() req: any,
  ) {
    return this.spaceService.create(createSpaceDto, communityId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get community spaces' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Spaces retrieved successfully' })
  async getCommunitySpaces(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: SpaceQueryDto,
    @Request() req: any,
  ) {
    return this.spaceService.getCommunitySpaces(communityId, req.user.id, {
      page: query.page,
      limit: query.limit,
      includePrivate: true,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search spaces in community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchSpaces(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query('q') query: string,
    @Query() options: SpaceQueryDto,
    @Request() req: any,
  ) {
    return this.spaceService.searchSpaces(query, communityId, {
      page: options.page,
      limit: options.limit,
      includePrivate: true,
      userId: req.user.id,
    });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular spaces in community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Popular spaces retrieved successfully' })
  async getPopularSpaces(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.spaceService.getPopularSpaces(communityId, {
      limit: limit ? parseInt(limit.toString()) : 10,
      includePrivate: true,
      userId: req.user.id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get space by ID' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Space found' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpace(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.spaceService.findOne(id, req.user?.id);
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get space by name' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'name', description: 'Space name' })
  @ApiResponse({ status: 200, description: 'Space found' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpaceByName(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('name') name: string,
    @Request() req: any,
  ) {
    return this.spaceService.findByName(communityId, name, req.user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Space updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async updateSpace(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @Request() req: any,
  ) {
    return this.spaceService.update(id, updateSpaceDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Space deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async deleteSpace(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.spaceService.delete(id, req.user.id);
  }

  // Member Management Endpoints
  @Get(':id/members')
  @ApiOperation({ summary: 'Get space members' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({ name: 'search', required: false, description: 'Search members' })
  async getSpaceMembers(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: SpaceMemberRole,
    @Query('search') search?: string,
  ) {
    return this.spaceMemberService.getMembers(id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
      role,
      search,
    });
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 201, description: 'Successfully joined space' })
  @ApiResponse({ status: 400, description: 'Already a member or other error' })
  async joinSpace(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() joinDto: JoinSpaceDto,
    @Request() req: any,
  ) {
    return this.spaceMemberService.addMember(id, req.user.id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removeMember(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    return this.spaceMemberService.removeMember(id, userId, req.user.id);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateMemberRole(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() roleDto: UpdateSpaceMemberRoleDto,
    @Request() req: any,
  ) {
    return this.spaceMemberService.updateMemberRole(id, userId, roleDto.role, req.user.id);
  }

  @Post(':id/members/:userId/ban')
  @ApiOperation({ summary: 'Ban member from space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiParam({ name: 'userId', description: 'User ID to ban' })
  @ApiResponse({ status: 200, description: 'Member banned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async banMember(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() banDto: BanSpaceMemberDto,
    @Request() req: any,
  ) {
    return this.spaceMemberService.banMember(id, userId, req.user.id, banDto.reason);
  }

  @Delete(':id/members/:userId/ban')
  @ApiOperation({ summary: 'Unban member from space' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiParam({ name: 'userId', description: 'User ID to unban' })
  @ApiResponse({ status: 200, description: 'Member unbanned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async unbanMember(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    return this.spaceMemberService.unbanMember(id, userId, req.user.id);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer space ownership' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can transfer ownership' })
  async transferOwnership(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() transferDto: TransferSpaceOwnershipDto,
    @Request() req: any,
  ) {
    // Check if user is the current owner
    const hasPermission = await this.spaceMemberService.hasSpacePermission(
      id,
      req.user.id,
      SpaceMemberRole.OWNER
    );

    if (!hasPermission) {
      throw new ForbiddenException('Only space owner can transfer ownership');
    }

    return this.spaceMemberService.transferOwnership(id, req.user.id, transferDto.newOwnerId);
  }

  // Statistics and Analytics Endpoints
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get space statistics' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getSpaceStats(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    // Check if user has permission to view stats
    const hasPermission = await this.spaceMemberService.hasSpacePermission(
      id,
      req.user.id,
      SpaceMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view statistics');
    }

    const [spaceStats, memberStats] = await Promise.all([
      this.spaceService.getSpaceStats(id),
      this.spaceMemberService.getMemberStats(id),
    ]);

    return {
      space: spaceStats,
      members: memberStats,
    };
  }

  @Get(':id/members/banned')
  @ApiOperation({ summary: 'Get banned members' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Banned members retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getBannedMembers(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Check if user has permission to view banned members
    const hasPermission = await this.spaceMemberService.hasSpacePermission(
      id,
      req.user.id,
      SpaceMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view banned members');
    }

    return this.spaceMemberService.getBannedMembers(id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get(':id/members/recent')
  @ApiOperation({ summary: 'Get recent members' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days back' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum results' })
  @ApiResponse({ status: 200, description: 'Recent members retrieved successfully' })
  async getRecentMembers(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceMemberService.getRecentMembers(
      id,
      days ? parseInt(days.toString()) : 7,
      limit ? parseInt(limit.toString()) : 10
    );
  }

  // User's Space Memberships
  @Get('me/memberships')
  @ApiOperation({ summary: 'Get user\'s space memberships in community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  async getUserSpaceMemberships(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceMemberService.getUserSpaces(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/owned')
  @ApiOperation({ summary: 'Get spaces owned by user in community' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Owned spaces retrieved successfully' })
  async getUserOwnedSpaces(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceService.getUserOwnedSpaces(req.user.id, communityId, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/joined')
  @ApiOperation({ summary: 'Get spaces joined by user in community (not owned)' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Joined spaces retrieved successfully' })
  async getUserJoinedSpaces(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceMemberService.getUserJoinedSpaces(req.user.id, communityId, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  // ==================== SECURE SPACE CONTENT ENDPOINTS ====================

  @Get(':id/content')
  @UseGuards(SpaceAccessGuard)
  // Don't specify content type in decorator - let the guard infer it dynamically
  @ApiOperation({ summary: 'Get space content (posts OR messages based on interaction type)' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: 'Number of items to return' })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0, description: 'Number of items to skip' })
  @ApiQuery({ name: 'type', enum: ['posts', 'messages'], required: false, description: 'Override content type detection' })
  @ApiQuery({ name: 'before', type: String, required: false, description: 'Cursor for pagination (message ID)' })
  @ApiQuery({ name: 'after', type: String, required: false, description: 'Cursor for pagination (message ID)' })
  @ApiResponse({ status: 200, description: 'Space content retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to space' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpaceContent(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) spaceId: string,
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('type') contentType?: 'posts' | 'messages',
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    console.log('🔵 [SpaceController] GET /content endpoint hit');
    console.log('🔵 [SpaceController] Params:', { communityId, spaceId });
    console.log('🔵 [SpaceController] Query params:', { limit, offset, contentType, before, after });
    console.log('🔵 [SpaceController] User ID:', req.user?.id);
    
    try {
      const result = await this.spaceService.getSpaceContent(spaceId, req.user.id, {
        limit,
        offset,
        contentType,
        before,
        after,
      });
      console.log('✅ [SpaceController] Content retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ [SpaceController] Error getting space content:', error);
      throw error;
    }
  }

  @Post(':id/content')
  @UseGuards(SpaceAccessGuard)
  // Don't specify content type in decorator - let the guard infer it dynamically
  @ApiOperation({ summary: 'Create content in space (post OR message based on interaction type)' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiBody({
    description: 'Content creation data (structure varies by space interaction type)',
    schema: {
      oneOf: [
        {
          type: 'object',
          title: 'Post Content',
          properties: {
            title: { type: 'string', maxLength: 200 },
            content: { type: 'string', maxLength: 10000 },
            tags: { type: 'array', items: { type: 'string' } },
            featuredImage: { type: 'string' },
          },
          required: ['content']
        },
        {
          type: 'object', 
          title: 'Message Content',
          properties: {
            content: { type: 'string', maxLength: 4000 },
            type: { type: 'string', enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE'] },
            replyToId: { type: 'string', format: 'uuid' },
            attachments: { type: 'array', items: { type: 'object' } },
            optimisticId: { type: 'string' }
          },
          required: ['content', 'type']
        }
      ]
    }
  })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to space' })
  async createSpaceContent(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) spaceId: string,
    @Body() createContentDto: any,
    @Request() req: any,
  ) {
    console.log('🟡 [SpaceController] POST /content endpoint hit');
    console.log('🟡 [SpaceController] Params:', { communityId, spaceId });
    console.log('🟡 [SpaceController] Body:', createContentDto);
    console.log('🟡 [SpaceController] User ID:', req.user?.id);
    
    try {
      const result = await this.spaceService.createSpaceContent(spaceId, req.user.id, createContentDto);
      console.log('✅ [SpaceController] Content created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ [SpaceController] Error creating space content:', error);
      throw error;
    }
  }
}

// Global Space Controller (not community-specific)
@ApiTags('Spaces - Global')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GlobalSpaceController {
  constructor(
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search all spaces across communities' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchAllSpaces(
    @Query('q') query: string,
    @Query() options: SpaceQueryDto,
    @Request() req: any,
  ) {
    return this.spaceService.searchSpaces(query, undefined, {
      page: options.page,
      limit: options.limit,
      includePrivate: false, // Only public spaces in global search
      userId: req.user.id,
    });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular spaces across all communities' })
  @ApiResponse({ status: 200, description: 'Popular spaces retrieved successfully' })
  async getGlobalPopularSpaces(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.spaceService.getPopularSpaces(undefined, {
      limit: limit ? parseInt(limit.toString()) : 20,
      includePrivate: false, // Only public spaces in global view
      userId: req.user.id,
    });
  }

  @Get('me/all')
  @ApiOperation({ summary: 'Get all user\'s space memberships' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'All memberships retrieved successfully' })
  async getAllUserSpaces(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceMemberService.getUserSpaces(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/owned')
  @ApiOperation({ summary: 'Get all spaces owned by user across all communities' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Owned spaces retrieved successfully' })
  async getAllOwnedSpaces(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceService.getUserOwnedSpaces(req.user.id, undefined, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/joined')
  @ApiOperation({ summary: 'Get all spaces joined by user across all communities (not owned)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Joined spaces retrieved successfully' })
  async getAllJoinedSpaces(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.spaceMemberService.getUserJoinedSpaces(req.user.id, undefined, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  // ==================== CHAT ENDPOINTS ====================

  @Post(':id/chat/conversation')
  @UseGuards(SpaceAccessGuard)
  @ApiOperation({ summary: 'Create or get space chat conversation' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        spaceName: { type: 'string', description: 'Space name for conversation title' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Space conversation created/retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to space' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async createSpaceConversation(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) spaceId: string,
    @Request() req: any,
    @Body() body: { spaceName?: string },
  ) {
    console.log('🔵 [SpaceController] POST /chat/conversation endpoint hit');
    console.log('🔵 [SpaceController] Params:', { communityId, spaceId, spaceName: body.spaceName });
    console.log('🔵 [SpaceController] User ID:', req.user?.id);
    
    try {
      const conversationId = await this.spaceService.getOrCreateSpaceConversation(
        spaceId, 
        req.user.id,
        body.spaceName
      );
      
      console.log('✅ [SpaceController] Space conversation created/retrieved:', conversationId);
      return { 
        success: true, 
        data: { conversationId },
        message: 'Space conversation ready'
      };
    } catch (error) {
      console.error('❌ [SpaceController] Error creating space conversation:', error);
      throw error;
    }
  }

  @Post(':id/chat/message')
  @UseGuards(SpaceAccessGuard)
  @ApiOperation({ summary: 'Send message to space chat' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        content: { type: 'string', description: 'Message content' },
        type: { type: 'string', enum: ['text', 'image', 'file'], description: 'Message type' }
      },
      required: ['content']
    }
  })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to space' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async sendSpaceMessage(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) spaceId: string,
    @Request() req: any,
    @Body() body: { content: string; type?: 'text' | 'image' | 'file' },
  ) {
    console.log('🔵 [SpaceController] POST /chat/message endpoint hit');
    console.log('🔵 [SpaceController] Params:', { communityId, spaceId, type: body.type });
    console.log('🔵 [SpaceController] User ID:', req.user?.id);
    console.log('🔵 [SpaceController] Content length:', body.content?.length);
    
    try {
      const result = await this.spaceService.sendSpaceMessage(spaceId, req.user.id, {
        content: body.content,
        type: body.type || 'text'
      });
      
      console.log('✅ [SpaceController] Space message sent successfully');
      return {
        success: true,
        data: result,
        message: 'Message sent successfully'
      };
    } catch (error) {
      console.error('❌ [SpaceController] Error sending space message:', error);
      throw error;
    }
  }

  @Get(':id/chat/messages')
  @UseGuards(SpaceAccessGuard)
  @ApiOperation({ summary: 'Get space chat messages' })
  @ApiParam({ name: 'communityId', description: 'Community ID' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50, description: 'Number of messages to return' })
  @ApiQuery({ name: 'before', type: String, required: false, description: 'Message ID to fetch messages before' })
  @ApiResponse({ status: 200, description: 'Space messages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to space' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpaceMessages(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('id', ParseUUIDPipe) spaceId: string,
    @Request() req: any,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
  ) {
    console.log('🔵 [SpaceController] GET /chat/messages endpoint hit');
    console.log('🔵 [SpaceController] Params:', { communityId, spaceId, limit, before });
    console.log('🔵 [SpaceController] User ID:', req.user?.id);
    
    try {
      const result = await this.spaceService.getSpaceMessages(spaceId, req.user.id, {
        limit,
        before
      });
      
      console.log('✅ [SpaceController] Space messages retrieved:', result?.messages?.length || 0);
      return result;
    } catch (error) {
      console.error('❌ [SpaceController] Error getting space messages:', error);
      throw error;
    }
  }
}
