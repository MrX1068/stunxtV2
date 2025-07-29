import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { PostType, PostVisibility } from '../../shared/entities/post.entity';

export class CreatePostDto {
  @ApiProperty({ 
    description: 'Post title', 
    example: 'My Amazing Post About Technology',
    minLength: 1,
    maxLength: 200 
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ 
    description: 'Post content', 
    example: 'This is the detailed content of my post...',
    maxLength: 50000 
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ 
    description: 'Type of post', 
    enum: PostType,
    example: PostType.TEXT 
  })
  @IsEnum(PostType)
  type: PostType;

  @ApiPropertyOptional({ 
    description: 'Post visibility', 
    enum: PostVisibility,
    example: PostVisibility.PUBLIC,
    default: PostVisibility.PUBLIC 
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ 
    description: 'Community ID if posting to a community. Must be a valid UUID.', 
    example: '00000000-0000-0000-0000-000000000000',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Community ID must be a valid UUID' })
  communityId?: string;

  @ApiPropertyOptional({ 
    description: 'Space ID if posting to a space. Must be a valid UUID.', 
    example: '00000000-0000-0000-0000-000000000001',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Space ID must be a valid UUID' })
  spaceId?: string;

  @ApiPropertyOptional({ 
    description: 'Post category', 
    example: 'Technology',
    maxLength: 50 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ 
    description: 'Post subcategory', 
    example: 'Programming',
    maxLength: 50 
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ 
    description: 'Tags for the post', 
    example: ['javascript', 'nodejs', 'backend'],
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Keywords for SEO', 
    example: ['web development', 'coding', 'tutorial'],
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ 
    description: 'Meta description for SEO', 
    example: 'Learn about the latest web development trends',
    maxLength: 160 
  })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Allow comments on this post', 
    example: true,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ 
    description: 'Allow reactions on this post', 
    example: true,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  allowReactions?: boolean;

  @ApiPropertyOptional({ 
    description: 'Allow sharing of this post', 
    example: true,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  allowSharing?: boolean;

  @ApiPropertyOptional({ 
    description: 'Mark as NSFW content', 
    example: false,
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  @ApiPropertyOptional({ 
    description: 'Mark as spoiler content', 
    example: false,
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isSpoiler?: boolean;

  @ApiPropertyOptional({ 
    description: 'Content warnings', 
    example: ['violence', 'mature themes'],
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentWarnings?: string[];

  @ApiPropertyOptional({ 
    description: 'Schedule post for future publication', 
    example: '2025-07-28T10:00:00Z' 
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @ApiPropertyOptional({ 
    description: 'Additional metadata', 
    example: { source: 'web', device: 'desktop' } 
  })
  @IsOptional()
  metadata?: any;
}
