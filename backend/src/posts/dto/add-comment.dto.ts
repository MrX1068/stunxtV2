import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({ 
    description: 'Comment content', 
    example: 'Great post! Thanks for sharing.',
    minLength: 1,
    maxLength: 2000 
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    description: 'Parent comment ID for replies', 
    example: '123e4567-e89b-12d3-a456-426614174002' 
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
