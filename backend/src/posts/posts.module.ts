import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from '../shared/entities/post.entity';
import { PostComment } from '../shared/entities/post-comment.entity';
import { PostReaction } from '../shared/entities/post-reaction.entity';
import { PostTag } from '../shared/entities/post-tag.entity';
import { PostMedia } from '../shared/entities/post-media.entity';
import { User } from '../shared/entities/user.entity';
import { Community } from '../shared/entities/community.entity';
import { CommunityMember } from '../shared/entities/community-member.entity';
import { Space } from '../shared/entities/space.entity';
import { SpaceMember } from '../shared/entities/space-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostComment,
      PostReaction,
      PostTag,
      PostMedia,
      User,
      Community,
      CommunityMember,
      Space,
      SpaceMember,
    ]),
    // Note: Using global Redis cache from MessagingModule (isGlobal: true)
    EventEmitterModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService, TypeOrmModule],
})
export class PostsModule {}
