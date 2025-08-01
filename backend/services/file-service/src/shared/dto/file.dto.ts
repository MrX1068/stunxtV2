import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FileCategory, FilePrivacy, VariantType } from '../enums/file.enum';

export class UploadFileDto {
  @ApiPropertyOptional({ 
    enum: FileCategory,
    description: 'File category',
    default: FileCategory.CONTENT
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory = FileCategory.CONTENT;

  @ApiPropertyOptional({ 
    enum: FilePrivacy,
    description: 'File privacy level',
    default: FilePrivacy.PRIVATE
  })
  @IsOptional()
  @IsEnum(FilePrivacy)
  privacy?: FilePrivacy = FilePrivacy.PRIVATE;

  @ApiPropertyOptional({ 
    type: [String],
    description: 'Variants to generate',
    example: ['thumbnail', 'small', 'medium']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value.split(','))
  variants?: string[];

  @ApiPropertyOptional({ 
    description: 'Additional metadata',
    example: { title: 'My Image', description: 'Profile picture' }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'New filename' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ enum: FilePrivacy })
  @IsOptional()
  @IsEnum(FilePrivacy)
  privacy?: FilePrivacy;

  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GenerateVariantsDto {
  @ApiProperty({ 
    description: 'Variants to generate',
    example: [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 300, quality: 80 },
      { name: 'webp', format: 'webp', quality: 90 }
    ]
  })
  @IsArray()
  variants: VariantConfig[];
}

export class VariantConfig {
  @ApiProperty({ description: 'Variant name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Width in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({ description: 'Height in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ description: 'Quality (1-100)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quality?: number;

  @ApiPropertyOptional({ description: 'Output format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Progressive JPEG' })
  @IsOptional()
  @IsBoolean()
  progressive?: boolean;
}

export class OptimizeFileDto {
  @ApiPropertyOptional({ description: 'Quality (1-100)', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quality?: number;

  @ApiPropertyOptional({ description: 'Output format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Progressive JPEG' })
  @IsOptional()
  @IsBoolean()
  progressive?: boolean;

  @ApiPropertyOptional({ description: 'Enable compression' })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;
}

export class InitResumableUploadDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Type(() => Number)
  size: number;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({ description: 'Chunk size in bytes', default: 1048576 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  chunkSize?: number = 1048576; // 1MB

  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: FilePrivacy })
  @IsOptional()
  @IsEnum(FilePrivacy)
  privacy?: FilePrivacy;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class FileQueryDto {
  @ApiPropertyOptional({ description: 'User ID to filter by' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: FileCategory, description: 'Category to filter by' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: FilePrivacy, description: 'Privacy level to filter by' })
  @IsOptional()
  @IsEnum(FilePrivacy)
  privacy?: FilePrivacy;

  @ApiPropertyOptional({ description: 'MIME type to filter by' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
