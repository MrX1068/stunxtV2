import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '../../shared/entities/space.entity';
import { SpaceMember } from '../../shared/entities/space-member.entity';
import { Community } from '../../shared/entities/community.entity';
import { CommunityMember } from '../../shared/entities/community-member.entity';
import { CommunityAuditLog } from '../../shared/entities/community-audit-log.entity';
import { User } from '../../shared/entities/user.entity';
import { Conversation } from '../../shared/entities/conversation.entity';
import { SpaceController, GlobalSpaceController } from './space.controller';
import { SpaceService } from './space.service';
import { SpaceMemberService } from './space-member.service';
import { SpaceSecurityService } from './space-security.service';
import { CommunityMemberService } from '../community/community-member.service';
import { CommunityAuditService } from '../community/community-audit.service';
import { MessagingModule } from '../../messaging/messaging.module';
import { PostsModule } from '../../posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Space,
      SpaceMember,
      Community,
      CommunityMember,
      CommunityAuditLog,
      User,
      Conversation,
    ]),
    MessagingModule, // For MessageService and ConversationService
    PostsModule, // For PostService
  ],
  controllers: [SpaceController, GlobalSpaceController],
  providers: [
    SpaceService,
    SpaceMemberService,
    SpaceSecurityService,
    CommunityMemberService, // Needed for space member validation
    CommunityAuditService, // Needed by CommunityMemberService
  ],
  exports: [
    SpaceService,
    SpaceMemberService,
    SpaceSecurityService,
  ],
})
export class SpaceModule {}
