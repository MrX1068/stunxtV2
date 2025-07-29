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
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/entities/user.entity';
import { UserService, UpdateUserDto, UpdateUserPreferencesDto, UserSearchOptions } from './user.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile with private data',
  })
  async getCurrentUser(@Request() req) {
    return this.userService.getUserById(req.user.id, true);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated user profile',
  })
  async updateCurrentUser(
    @Request() req,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(req.user.id, updateUserDto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User statistics including followers, posts, engagement',
  })
  async getCurrentUserStats(@Request() req) {
    return this.userService.getUserStats(req.user.id);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences and settings',
  })
  async getCurrentUserPreferences(@Request() req) {
    const user = await this.userService.getUserById(req.user.id, true);
    return user.preferences;
  }

  @Put('me/preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated user preferences',
  })
  async updateCurrentUserPreferences(
    @Request() req,
    @Body(ValidationPipe) preferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.userService.updatePreferences(req.user.id, preferencesDto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: Implement file upload service
    return {
      message: 'Avatar upload functionality will be implemented with file service',
      file: file ? file.filename : null,
    };
  }

  @Post('me/banner')
  @ApiOperation({ summary: 'Upload user banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Banner uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBanner(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: Implement file upload service
    return {
      message: 'Banner upload functionality will be implemented with file service',
      file: file ? file.filename : null,
    };
  }

  @Get('me/followers')
  @ApiOperation({ summary: 'Get current user followers' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of followers to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of followers to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user followers',
  })
  async getCurrentUserFollowers(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const validLimit = Math.min(Math.max(limit, 1), 100);
    return this.userService.getUserFollowers(req.user.id, validLimit, offset);
  }

  @Get('me/following')
  @ApiOperation({ summary: 'Get users current user is following' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of users to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users being followed',
  })
  async getCurrentUserFollowing(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const validLimit = Math.min(Math.max(limit, 1), 100);
    return this.userService.getUserFollowing(req.user.id, validLimit, offset);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'verified', required: false, type: Boolean, description: 'Filter verified users only' })
  @ApiQuery({ name: 'online', required: false, type: Boolean, description: 'Filter online users only' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of users to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results',
  })
  async searchUsers(
    @Query('q') query?: string,
    @Query('role') role?: UserRole,
    @Query('verified') verifiedOnly?: boolean,
    @Query('online') onlineOnly?: boolean,
    @Query('location') location?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const validLimit = Math.min(Math.max(limit || 20, 1), 100);
    
    const searchOptions: UserSearchOptions = {
      query,
      role,
      verifiedOnly,
      onlineOnly,
      location,
      sortBy: sortBy as any,
      sortOrder,
      limit: validLimit,
      offset,
      includeProfile: true,
    };

    return this.userService.searchUsers(searchOptions);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile (public data only)',
  })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserById(id, false);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user statistics by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User statistics',
  })
  async getUserStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserStats(id);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get user followers by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of followers to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of followers to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user followers',
  })
  async getUserFollowers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const validLimit = Math.min(Math.max(limit, 1), 100);
    return this.userService.getUserFollowers(id, validLimit, offset);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Get users being followed by user ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of users to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users being followed',
  })
  async getUserFollowing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const validLimit = Math.min(Math.max(limit, 1), 100);
    return this.userService.getUserFollowing(id, validLimit, offset);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID to follow' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully followed user',
  })
  async followUser(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.followUser(req.user.id, id);
  }

  @Delete(':id/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID to unfollow' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully unfollowed user',
  })
  async unfollowUser(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.userService.unfollowUser(req.user.id, id);
    return { message: 'Successfully unfollowed user' };
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID to block' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully blocked user',
  })
  async blockUser(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.blockUser(req.user.id, id);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID to unblock' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully unblocked user',
  })
  async unblockUser(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // TODO: Implement unblock functionality
    return { message: 'Unblock functionality will be implemented' };
  }

  // Admin endpoints
  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by user status' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of users to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all users with private data',
  })
  async getAllUsersAdmin(
    @Query('status') status?: string,
    @Query('role') role?: UserRole,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const searchOptions: UserSearchOptions = {
      role,
      status: status as any,
      limit: Math.min(limit || 50, 200),
      offset,
      includeProfile: true,
      includeStats: true,
    };

    return this.userService.searchUsers(searchOptions);
  }

  @Put('admin/users/:id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user role (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role updated successfully',
  })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
  ) {
    // TODO: Implement role update functionality
    return { message: 'User role update functionality will be implemented' };
  }

  @Put('admin/users/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User status updated successfully',
  })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    // TODO: Implement status update functionality
    return { message: 'User status update functionality will be implemented' };
  }
}
