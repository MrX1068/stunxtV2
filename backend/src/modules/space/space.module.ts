import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '../../shared/entities/space.entity';
import { SpaceMember } from '../../shared/entities/space-member.entity';
import { Community } from '../../shared/entities/community.entity';
import { CommunityMember } from '../../shared/entities/community-member.entity';
import { CommunityAuditLog } from '../../shared/entities/community-audit-log.entity';
import { User } from '../../shared/entities/user.entity';
import { SpaceController, GlobalSpaceController } from './space.controller';
import { SpaceService } from './space.service';
import { SpaceMemberService } from './space-member.service';
import { CommunityMemberService } from '../community/community-member.service';
import { CommunityAuditService } from '../community/community-audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Space,
      SpaceMember,
      Community,
      CommunityMember,
      CommunityAuditLog,
      User,
    ]),
  ],
  controllers: [SpaceController, GlobalSpaceController],
  providers: [
    SpaceService,
    SpaceMemberService,
    CommunityMemberService, // Needed for space member validation
    CommunityAuditService, // Needed by CommunityMemberService
  ],
  exports: [
    SpaceService,
    SpaceMemberService,
  ],
})
export class SpaceModule {}
