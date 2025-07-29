import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReactionType } from '../../shared/entities/post-reaction.entity';

export class AddReactionDto {
  @ApiProperty({ 
    description: 'Type of reaction', 
    enum: ReactionType,
    example: ReactionType.LIKE 
  })
  @IsEnum(ReactionType)
  type: ReactionType;
}
