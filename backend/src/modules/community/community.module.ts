import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityMemberService } from './community-member.service';
import { CommunityInviteService } from './community-invite.service';
import { CommunityAuditService } from './community-audit.service';
import { CommunityJoinRequestService } from './community-join-request.service';
import { Community } from '../../shared/entities/community.entity';
import { CommunityMember } from '../../shared/entities/community-member.entity';
import { CommunityInvite } from '../../shared/entities/community-invite.entity';
import { CommunityAuditLog } from '../../shared/entities/community-audit-log.entity';
import { CommunityJoinRequest } from '../../shared/entities/community-join-request.entity';
import { Space } from '../../shared/entities/space.entity';
import { SpaceMember } from '../../shared/entities/space-member.entity';
import { User } from '../../shared/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // Import AuthModule for JwtAuthGuard dependencies
    TypeOrmModule.forFeature([
      Community,
      CommunityMember,
      CommunityInvite,
      CommunityAuditLog,
      CommunityJoinRequest,
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
    CommunityJoinRequestService,
  ],
  exports: [
    CommunityService,
    CommunityMemberService,
    CommunityInviteService,
    CommunityAuditService,
    CommunityJoinRequestService,
  ],
})
export class CommunityModule {}
