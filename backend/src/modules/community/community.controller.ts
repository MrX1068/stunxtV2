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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CommunityMemberService } from './community-member.service';
import { CommunityInviteService } from './community-invite.service';
import { CommunityAuditService } from './community-audit.service';
import { 
  CreateCommunityDto, 
  UpdateCommunityDto, 
  CommunityQueryDto,
  InviteUserDto,
  JoinCommunityDto 
} from './dto/community.dto';
import { CommunityMemberRole } from '../../shared/entities/community-member.entity';
import { CommunityInviteType } from '../../shared/entities/community-invite.entity';

@ApiTags('Communities')
@Controller('communities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly memberService: CommunityMemberService,
    private readonly inviteService: CommunityInviteService,
    private readonly auditService: CommunityAuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new community' })
  @ApiResponse({ status: 201, description: 'Community created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Community slug already exists' })
  async createCommunity(
    @Body() createCommunityDto: CreateCommunityDto,
    @Request() req: any,
  ) {
    return this.communityService.create(createCommunityDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get communities with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Communities retrieved successfully' })
  async getCommunities(
    @Query() query: CommunityQueryDto,
    @Request() req: any,
  ) {
    return this.communityService.findAll(query, req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get community by ID' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Community found' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  async getCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.communityService.findOne(id, req.user?.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get community by slug' })
  @ApiParam({ name: 'slug', description: 'Community slug' })
  @ApiResponse({ status: 200, description: 'Community found' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  async getCommunityBySlug(
    @Param('slug') slug: string,
    @Request() req: any,
  ) {
    return this.communityService.findBySlug(slug, req.user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Community updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  async updateCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommunityDto: UpdateCommunityDto,
    @Request() req: any,
  ) {
    // Check if user has permission to update
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this community');
    }

    return this.communityService.update(id, updateCommunityDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Community deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  async deleteCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    // Only owner can delete community
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.OWNER
    );

    if (!hasPermission) {
      throw new ForbiddenException('Only community owner can delete the community');
    }

    return this.communityService.delete(id, req.user.id);
  }

  // Member Management Endpoints
  @Get(':id/members')
  @ApiOperation({ summary: 'Get community members' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({ name: 'search', required: false, description: 'Search members' })
  async getCommunityMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: CommunityMemberRole,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    return this.memberService.getMembers(id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
      role,
      search,
    });
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 201, description: 'Successfully joined community' })
  @ApiResponse({ status: 400, description: 'Already a member or other error' })
  async joinCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() joinDto: JoinCommunityDto,
    @Request() req: any,
  ) {
    if (joinDto.inviteCode) {
      // Join via invite
      return this.inviteService.acceptInvite(joinDto.inviteCode, req.user.id);
    } else {
      // Direct join
      return this.memberService.addMember(id, req.user.id);
    }
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    // Check if user has permission to remove members
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    return this.memberService.removeMember(id, userId, req.user.id);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: CommunityMemberRole,
    @Request() req: any,
  ) {
    // Check if user has permission to change roles
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to change member roles');
    }

    return this.memberService.updateMemberRole(id, userId, role, req.user.id);
  }

  @Post(':id/members/:userId/ban')
  @ApiOperation({ summary: 'Ban member from community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiParam({ name: 'userId', description: 'User ID to ban' })
  @ApiResponse({ status: 200, description: 'Member banned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async banMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    // Check if user has permission to ban members
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to ban members');
    }

    return this.memberService.banMember(id, userId, req.user.id, reason);
  }

  @Delete(':id/members/:userId/ban')
  @ApiOperation({ summary: 'Unban member from community' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiParam({ name: 'userId', description: 'User ID to unban' })
  @ApiResponse({ status: 200, description: 'Member unbanned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async unbanMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    // Check if user has permission to unban members
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to unban members');
    }

    return this.memberService.unbanMember(id, userId, req.user.id);
  }

  // Invite Management Endpoints
  @Post(':id/invites')
  @ApiOperation({ summary: 'Create community invite' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 201, description: 'Invite created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() inviteDto: InviteUserDto,
    @Request() req?: any,
  ) {
    return this.inviteService.createInvite(id, req.user.id, {
      type: inviteDto.email ? CommunityInviteType.EMAIL : CommunityInviteType.LINK,
      email: inviteDto.email,
      message: inviteDto.message,
      expiresAt: inviteDto.expiresAt,
    });
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'Get community invites' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getCommunityInvites(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    // Check if user has permission to view invites
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view invites');
    }

    return this.inviteService.getCommunityInvites(id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke community invite' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiParam({ name: 'inviteId', description: 'Invite ID' })
  @ApiResponse({ status: 200, description: 'Invite revoked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async revokeInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Request() req: any,
  ) {
    return this.inviteService.revokeInvite(inviteId, req.user.id);
  }

  // Invitation Management for Users
  @Post('invites/:inviteCode/accept')
  @ApiOperation({ summary: 'Accept community invitation' })
  @ApiParam({ name: 'inviteCode', description: 'Invitation code' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  async acceptInvitation(
    @Param('inviteCode') inviteCode: string,
    @Request() req: any,
  ) {
    return this.inviteService.acceptInvite(inviteCode, req.user.id);
  }

  @Post('invites/:inviteCode/reject')
  @ApiOperation({ summary: 'Reject community invitation' })
  @ApiParam({ name: 'inviteCode', description: 'Invitation code' })
  @ApiResponse({ status: 200, description: 'Invitation rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  async rejectInvitation(
    @Param('inviteCode') inviteCode: string,
    @Request() req: any,
  ) {
    return this.inviteService.rejectInvite(inviteCode, req.user.id);
  }

  // Statistics and Analytics Endpoints
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get community statistics' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getCommunityStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req?: any,
  ) {
    // Check if user has permission to view stats
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.MODERATOR
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view statistics');
    }

    const [memberStats, inviteStats] = await Promise.all([
      this.memberService.getMemberStats(id),
      this.inviteService.getInviteStats(id),
    ]);

    return {
      members: memberStats,
      invites: inviteStats,
    };
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'Get community audit logs' })
  @ApiParam({ name: 'id', description: 'Community ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    // Check if user has permission to view audit logs
    const hasPermission = await this.memberService.checkMemberPermissions(
      id,
      req.user.id,
      CommunityMemberRole.ADMIN
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view audit logs');
    }

    return this.auditService.getAuditLogs(id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 50,
    });
  }

  // User's Communities
  @Get('me/memberships')
  @ApiOperation({ summary: 'Get user\'s community memberships' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  async getUserMemberships(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.memberService.getUserCommunities(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/invites')
  @ApiOperation({ summary: 'Get user\'s pending invites' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Invites retrieved successfully' })
  async getUserInvites(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.inviteService.getUserInvites(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/owned')
  @ApiOperation({ summary: 'Get communities owned by user' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Owned communities retrieved successfully' })
  async getOwnedCommunities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.communityService.getUserOwnedCommunities(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  @Get('me/joined')
  @ApiOperation({ summary: 'Get communities joined by user (not owned)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Joined communities retrieved successfully' })
  async getJoinedCommunities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.memberService.getUserJoinedCommunities(req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }

  // Public Endpoints (no authentication required)
  @Get('public/discover')
  @ApiOperation({ summary: 'Discover public communities' })
  @ApiResponse({ status: 200, description: 'Public communities retrieved successfully' })
  async discoverCommunities(@Query() query: CommunityQueryDto) {
    return this.communityService.findAll(query);
  }
}
