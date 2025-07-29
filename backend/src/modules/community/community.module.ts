import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityMemberService } from './community-member.service';
import { CommunityInviteService } from './community-invite.service';
import { CommunityAuditService } from './community-audit.service';
import { Community } from '../../shared/entities/community.entity';
import { CommunityMember } from '../../shared/entities/community-member.entity';
import { CommunityInvite } from '../../shared/entities/community-invite.entity';
import { CommunityAuditLog } from '../../shared/entities/community-audit-log.entity';
import { Space } from '../../shared/entities/space.entity';
import { SpaceMember } from '../../shared/entities/space-member.entity';
import { User } from '../../shared/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Community,
      CommunityMember,
      CommunityInvite,
      CommunityAuditLog,
      Space,
      SpaceMember,
      User,
    ]),
  ],
  controllers: [CommunityController],
  providers: [
    CommunityService,
    CommunityMemberService,
    CommunityInviteService,
    CommunityAuditService,
  ],
  exports: [
    CommunityService,
    CommunityMemberService,
    CommunityInviteService,
    CommunityAuditService,
  ],
})
export class CommunityModule {}
