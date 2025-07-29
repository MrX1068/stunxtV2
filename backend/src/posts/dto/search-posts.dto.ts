import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsArray, IsDateString, IsUUID } from 'class-validator';
import { PostType, PostStatus, PostVisibility } from '../../shared/entities/post.entity';

export class SearchPostsDto {
  @ApiPropertyOptional({ description: 'Search query', example: 'javascript tutorial' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Post type filter', enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional({ description: 'Post status filter', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: 'Post visibility filter', enum: PostVisibility })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ description: 'Community ID filter' })
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @ApiPropertyOptional({ description: 'Space ID filter' })
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @ApiPropertyOptional({ description: 'Author ID filter' })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Category filter', example: 'Technology' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags filter', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'commentCount', 'engagementRate'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'engagementRate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Limit results', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', example: 0, minimum: 0 })
  @IsOptional()
  offset?: number;
}
