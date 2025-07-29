import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsBoolean, 
  IsInt, 
  Min, 
  Max, 
  Length, 
  IsUrl, 
  IsUUID,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceType, SpaceStatus, SpaceCategory } from '../../../shared/entities/space.entity';
import { SpaceMemberRole } from '../../../shared/entities/space-member.entity';

export class CreateSpaceDto {
  @ApiProperty({
    description: 'Space name',
    example: 'General Discussion',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Space description',
    example: 'A place for general discussions and announcements',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    description: 'Space type',
    enum: SpaceType,
    example: SpaceType.PUBLIC
  })
  @IsEnum(SpaceType)
  type: SpaceType;

  @ApiProperty({
    description: 'Space category',
    enum: SpaceCategory,
    example: SpaceCategory.GENERAL
  })
  @IsEnum(SpaceCategory)
  category: SpaceCategory;

  @ApiPropertyOptional({
    description: 'Space avatar URL',
    example: 'https://example.com/space-avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Space banner URL',
    example: 'https://example.com/space-banner.jpg'
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of members',
    example: 500,
    minimum: 1,
    maximum: 10000,
    default: 1000
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxMembers?: number = 1000;

  @ApiPropertyOptional({
    description: 'Allow member invites',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowMemberInvites?: boolean = false;

  @ApiPropertyOptional({
    description: 'Require approval to join',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireApproval?: boolean = false;

  @ApiPropertyOptional({
    description: 'Allow file uploads',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowFileUploads?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 25 * 1024 * 1024,
    default: 25 * 1024 * 1024
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFileSize?: number = 25 * 1024 * 1024;

  @ApiPropertyOptional({
    description: 'Enable slow mode',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableSlowMode?: boolean = false;

  @ApiPropertyOptional({
    description: 'Slow mode delay in seconds',
    example: 30,
    minimum: 0,
    maximum: 3600,
    default: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  slowModeDelay?: number = 0;

  @ApiPropertyOptional({
    description: 'Space tags',
    example: ['discussion', 'general', 'community'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Welcome message for new members',
    example: 'Welcome to our general discussion space!',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: 'Space rules and guidelines',
    example: 'Be respectful and stay on topic',
    maxLength: 5000
  })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  rules?: string;

  @ApiPropertyOptional({
    description: 'Space color theme',
    example: '#3b82f6'
  })
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiPropertyOptional({
    description: 'Enable automatic moderation',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableAutoModeration?: boolean = false;

  @ApiPropertyOptional({
    description: 'List of banned words',
    example: ['spam', 'inappropriate'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedWords?: string[];
}

export class UpdateSpaceDto {
  @ApiPropertyOptional({
    description: 'Space name',
    example: 'Updated Discussion Space',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Space description',
    example: 'An updated description for our space',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Space type',
    enum: SpaceType
  })
  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @ApiPropertyOptional({
    description: 'Space category',
    enum: SpaceCategory
  })
  @IsOptional()
  @IsEnum(SpaceCategory)
  category?: SpaceCategory;

  @ApiPropertyOptional({
    description: 'Space status',
    enum: SpaceStatus
  })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @ApiPropertyOptional({
    description: 'Space avatar URL'
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Space banner URL'
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of members',
    minimum: 1,
    maximum: 10000
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxMembers?: number;

  @ApiPropertyOptional({
    description: 'Allow member invites'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowMemberInvites?: boolean;

  @ApiPropertyOptional({
    description: 'Require approval to join'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Allow file uploads'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowFileUploads?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFileSize?: number;

  @ApiPropertyOptional({
    description: 'Enable slow mode'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableSlowMode?: boolean;

  @ApiPropertyOptional({
    description: 'Slow mode delay in seconds',
    minimum: 0,
    maximum: 3600
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  slowModeDelay?: number;

  @ApiPropertyOptional({
    description: 'Space tags',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Welcome message for new members',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: 'Space rules and guidelines',
    maxLength: 5000
  })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  rules?: string;

  @ApiPropertyOptional({
    description: 'Space color theme'
  })
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiPropertyOptional({
    description: 'Enable automatic moderation'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableAutoModeration?: boolean;

  @ApiPropertyOptional({
    description: 'List of banned words',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedWords?: string[];

  @ApiPropertyOptional({
    description: 'Pin space in community'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Feature space'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;
}

export class SpaceQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query for space name or description',
    example: 'discussion',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by space type',
    enum: SpaceType
  })
  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @ApiPropertyOptional({
    description: 'Filter by space status',
    enum: SpaceStatus
  })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: SpaceCategory
  })
  @IsOptional()
  @IsEnum(SpaceCategory)
  category?: SpaceCategory;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['discussion', 'general'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['name', 'createdAt', 'updatedAt', 'memberCount']
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Filter by private/public spaces'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Community ID to filter spaces',
    example: 'uuid-string'
  })
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @ApiPropertyOptional({
    description: 'Include private spaces user has access to'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePrivate?: boolean;
}

export class JoinSpaceDto {
  @ApiPropertyOptional({
    description: 'Join request message',
    example: 'I would like to join this space',
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

export class UpdateSpaceMemberRoleDto {
  @ApiProperty({
    description: 'New member role',
    enum: SpaceMemberRole,
    example: SpaceMemberRole.MODERATOR
  })
  @IsEnum(SpaceMemberRole)
  role: SpaceMemberRole;
}

export class BanSpaceMemberDto {
  @ApiPropertyOptional({
    description: 'Reason for banning the member',
    example: 'Violation of space rules',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class TransferSpaceOwnershipDto {
  @ApiProperty({
    description: 'User ID of the new owner',
    example: 'uuid-string'
  })
  @IsUUID()
  newOwnerId: string;

  @ApiPropertyOptional({
    description: 'Reason for ownership transfer',
    example: 'Stepping down as space owner',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}
