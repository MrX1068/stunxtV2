import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, IsUrl, Length, Min, Max, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityType, CommunityInteractionType, JoinRequirement } from '../../../shared/entities/community.entity';
import { Transform } from 'class-transformer';

export class CreateCommunityDto {
  @ApiProperty({ 
    description: 'Community name', 
    example: 'Tech Enthusiasts',
    minLength: 3,
    maxLength: 100
  })
  @IsString()
  @Length(3, 100, { message: 'Community name must be between 3 and 100 characters' })
  name: string;

  @ApiProperty({ 
    description: 'Brief description of what your community is about', 
    example: 'A place for tech lovers to share ideas and connect',
    minLength: 10,
    maxLength: 500
  })
  @IsString()
  @Length(10, 500, { message: 'Description must be between 10 and 500 characters' })
  description: string;

  @ApiProperty({ 
    description: 'Community visibility', 
    enum: CommunityType, 
    default: CommunityType.PUBLIC,
    example: CommunityType.PUBLIC
  })
  @IsEnum(CommunityType, { message: 'Invalid community type' })
  type: CommunityType;

  @ApiPropertyOptional({ 
    description: 'Community interaction type - how members interact', 
    enum: CommunityInteractionType, 
    default: CommunityInteractionType.HYBRID,
    example: CommunityInteractionType.HYBRID
  })
  @IsOptional()
  @IsEnum(CommunityInteractionType, { message: 'Invalid community interaction type' })
  interactionType?: CommunityInteractionType;

  // Optional customization fields (can be added later)
  @ApiPropertyOptional({ 
    description: 'Community avatar URL (can be added later)',
    example: 'https://example.com/avatar.jpg'
  })
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl && o.avatarUrl.trim() !== '')
  @IsUrl({}, { message: 'Please provide a valid avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Community cover image URL (can be added later)',
    example: 'https://example.com/cover.jpg'
  })
  @IsOptional()
  @ValidateIf((o) => o.coverImageUrl && o.coverImageUrl.trim() !== '')
  @IsUrl({}, { message: 'Please provide a valid cover image URL' })
  coverImageUrl?: string;
}

export class UpdateCommunityDto {
  @ApiPropertyOptional({ description: 'Community name' })
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Community name must be between 3 and 100 characters' })
  name?: string;

  @ApiPropertyOptional({ description: 'Community URL slug' })
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Community slug must be between 3 and 50 characters' })
  @Transform(({ value }) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
  slug?: string;

  @ApiPropertyOptional({ description: 'Community description' })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({ description: 'Community type', enum: CommunityType })
  @IsOptional()
  @IsEnum(CommunityType, { message: 'Invalid community type' })
  type?: CommunityType;

  @ApiPropertyOptional({ description: 'Community interaction type', enum: CommunityInteractionType })
  @IsOptional()
  @IsEnum(CommunityInteractionType, { message: 'Invalid community interaction type' })
  interactionType?: CommunityInteractionType;

  @ApiPropertyOptional({ description: 'Join requirement', enum: JoinRequirement })
  @IsOptional()
  @IsEnum(JoinRequirement, { message: 'Invalid join requirement' })
  joinRequirement?: JoinRequirement;

  @ApiPropertyOptional({ description: 'Community avatar URL' })
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl && o.avatarUrl.trim() !== '')
  @IsUrl({}, { message: 'Please provide a valid avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Community cover image URL' })
  @IsOptional()
  @ValidateIf((o) => o.coverImageUrl && o.coverImageUrl.trim() !== '')
  @IsUrl({}, { message: 'Please provide a valid cover image URL' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Allow invites to community' })
  @IsOptional()
  @IsBoolean()
  allowInvites?: boolean;

  @ApiPropertyOptional({ description: 'Allow members to create invites' })
  @IsOptional()
  @IsBoolean()
  allowMemberInvites?: boolean;

  @ApiPropertyOptional({ description: 'Allow members to create spaces' })
  @IsOptional()
  @IsBoolean()
  allowSpaceCreation?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of members' })
  @IsOptional()
  @IsNumber({}, { message: 'Max members must be a number' })
  @Min(1, { message: 'Max members must be at least 1' })
  @Max(1000000, { message: 'Max members cannot exceed 1,000,000' })
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @ValidateIf((o) => o.website && o.website.trim() !== '')
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Discord server URL' })
  @IsOptional()
  @ValidateIf((o) => o.discordUrl && o.discordUrl.trim() !== '')
  @IsUrl({}, { message: 'Discord URL must be a valid URL' })
  discordUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter handle (without @)' })
  @IsOptional()
  @IsString()
  @Length(1, 15, { message: 'Twitter handle must be 1-15 characters' })
  twitterHandle?: string;

  @ApiPropertyOptional({ description: 'GitHub organization' })
  @IsOptional()
  @IsString()
  @Length(1, 39, { message: 'GitHub organization must be 1-39 characters' })
  githubOrg?: string;

  @ApiPropertyOptional({ description: 'SEO keywords for discovery' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Enable slow mode' })
  @IsOptional()
  @IsBoolean()
  enableSlowMode?: boolean;

  @ApiPropertyOptional({ description: 'Slow mode delay in seconds' })
  @IsOptional()
  @IsNumber({}, { message: 'Slow mode delay must be a number' })
  @Min(0, { message: 'Slow mode delay cannot be negative' })
  @Max(3600, { message: 'Slow mode delay cannot exceed 1 hour' })
  slowModeDelay?: number;

  @ApiPropertyOptional({ description: 'Enable word filter' })
  @IsOptional()
  @IsBoolean()
  enableWordFilter?: boolean;

  @ApiPropertyOptional({ description: 'Banned words list' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedWords?: string[];
}

export class CommunityQueryDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Community type filter', enum: CommunityType })
  @IsOptional()
  @IsEnum(CommunityType, { message: 'Invalid community type' })
  type?: CommunityType;

  @ApiPropertyOptional({ description: 'Show only featured communities' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Show only verified communities' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['members', 'activity', 'created', 'name'] })
  @IsOptional()
  @IsString()
  sortBy?: 'members' | 'activity' | 'created' | 'name';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;
}

export class CommunityResponseDto {
  @ApiProperty({ description: 'Community ID' })
  id: string;

  @ApiProperty({ description: 'Community name' })
  name: string;

  @ApiProperty({ description: 'Community slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Community description' })
  description?: string;

  @ApiProperty({ description: 'Community type', enum: CommunityType })
  type: CommunityType;

  @ApiProperty({ description: 'Member count' })
  memberCount: number;

  @ApiProperty({ description: 'Space count' })
  spaceCount: number;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  coverImageUrl?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Is featured' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Is platform verified' })
  isPlatformVerified: boolean;
}

export class InviteUserDto {
  @ApiPropertyOptional({
    description: 'Email address to invite (required for email invites, optional for link invites)',
    example: 'user@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Custom invitation message',
    example: 'Join our awesome community!',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;

  @ApiPropertyOptional({
    description: 'Expiration date for the invitation',
    example: '2024-12-31T23:59:59Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  expiresAt?: Date;
}

export class JoinCommunityDto {
  @ApiPropertyOptional({
    description: 'Join request message',
    example: 'I would like to join this community',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;

  @ApiPropertyOptional({
    description: 'Invitation code if joining via invite',
    example: 'abc123def456'
  })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class CreateJoinRequestDto {
  @ApiPropertyOptional({
    description: 'Message explaining why you want to join',
    example: 'I am interested in this community and would like to contribute',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}

export class ProcessJoinRequestDto {
  @ApiPropertyOptional({
    description: 'Admin response message',
    example: 'Welcome to the community!',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  adminResponse?: string;
}
