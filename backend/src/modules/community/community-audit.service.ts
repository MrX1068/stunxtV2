import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  CommunityAuditLog, 
  CommunityAuditAction, 
  CommunityAuditSeverity 
} from '../../shared/entities/community-audit-log.entity';

@Injectable()
export class CommunityAuditService {
  constructor(
    @InjectRepository(CommunityAuditLog)
    private readonly auditRepository: Repository<CommunityAuditLog>,
  ) {}

  async logCommunityCreated(
    communityId: string,
    performedBy: string,
    communityName: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.COMMUNITY_CREATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      description: `Community "${communityName}" was created`,
      data: { communityName },
    });

    await this.auditRepository.save(auditLog);
  }

  async logCommunityUpdated(
    communityId: string,
    performedBy: string,
    changes: Record<string, any>,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.COMMUNITY_UPDATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      description: 'Community settings were updated',
      changes,
    });

    await this.auditRepository.save(auditLog);
  }

  async logCommunityDeleted(
    communityId: string,
    performedBy: string,
    communityName: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.COMMUNITY_DELETED,
      severity: CommunityAuditSeverity.HIGH,
      performedBy,
      description: `Community "${communityName}" was deleted`,
      data: { communityName },
    });

    await this.auditRepository.save(auditLog);
  }

  async logMemberJoined(
    communityId: string,
    userId: string,
    invitedBy?: string,
    method?: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.MEMBER_JOINED,
      severity: CommunityAuditSeverity.LOW,
      targetId: userId,
      targetType: 'user',
      description: 'User joined the community',
      data: { invitedBy, joinMethod: method },
    });

    await this.auditRepository.save(auditLog);
  }

  async logMemberLeft(
    communityId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.MEMBER_LEFT,
      severity: CommunityAuditSeverity.LOW,
      targetId: userId,
      targetType: 'user',
      description: 'User left the community',
      data: { reason },
    });

    await this.auditRepository.save(auditLog);
  }

  async logMemberKicked(
    communityId: string,
    kickedUserId: string,
    performedBy: string,
    reason?: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.MEMBER_KICKED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: kickedUserId,
      targetType: 'user',
      description: 'User was kicked from the community',
      data: { reason },
    });

    await this.auditRepository.save(auditLog);
  }

  async logMemberBanned(
    communityId: string,
    bannedUserId: string,
    performedBy: string,
    reason?: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.MEMBER_BANNED,
      severity: CommunityAuditSeverity.HIGH,
      performedBy,
      targetId: bannedUserId,
      targetType: 'user',
      description: 'User was banned from the community',
      data: { reason },
    });

    await this.auditRepository.save(auditLog);
  }

  async logRoleChanged(
    communityId: string,
    userId: string,
    performedBy: string,
    oldRole: string,
    newRole: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.MEMBER_ROLE_CHANGED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: userId,
      targetType: 'user',
      description: `User role changed from ${oldRole} to ${newRole}`,
      changes: {
        role: { before: oldRole, after: newRole },
      },
    });

    await this.auditRepository.save(auditLog);
  }

  async logSpaceCreated(
    communityId: string,
    spaceId: string,
    performedBy: string,
    spaceName: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.SPACE_CREATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      targetId: spaceId,
      targetType: 'space',
      description: `Space "${spaceName}" was created`,
      data: { spaceName },
    });

    await this.auditRepository.save(auditLog);
  }

  async logSpaceDeleted(
    communityId: string,
    spaceId: string,
    performedBy: string,
    spaceName: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.SPACE_DELETED,
      severity: CommunityAuditSeverity.MEDIUM,
      performedBy,
      targetId: spaceId,
      targetType: 'space',
      description: `Space "${spaceName}" was deleted`,
      data: { spaceName },
    });

    await this.auditRepository.save(auditLog);
  }

  async logInviteCreated(
    communityId: string,
    inviteId: string,
    performedBy: string,
    inviteType: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.INVITE_CREATED,
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      targetId: inviteId,
      targetType: 'invite',
      description: `${inviteType} invite was created`,
      data: { inviteType },
    });

    await this.auditRepository.save(auditLog);
  }

  async logInviteRejected(
    communityId: string,
    inviteId: string,
    performedBy: string,
    reason?: string,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.INVITE_REVOKED, // Using closest existing action
      severity: CommunityAuditSeverity.LOW,
      performedBy,
      targetId: inviteId,
      targetType: 'invite',
      description: `Invite was rejected`,
      data: { reason: reason || 'User rejected invite' },
    });

    await this.auditRepository.save(auditLog);
  }

  async logAutoModeration(
    communityId: string,
    userId: string,
    reason: string,
    details: Record<string, any>,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      communityId,
      action: CommunityAuditAction.AUTO_MODERATION_TRIGGERED,
      severity: CommunityAuditSeverity.MEDIUM,
      targetId: userId,
      targetType: 'user',
      description: `Auto-moderation triggered: ${reason}`,
      data: details,
    });

    await this.auditRepository.save(auditLog);
  }

  async getAuditLogs(
    communityId: string,
    options?: {
      page?: number;
      limit?: number;
      action?: CommunityAuditAction;
      severity?: CommunityAuditSeverity;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: CommunityAuditLog[]; total: number }> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.performer', 'performer')
      .where('log.communityId = :communityId', { communityId });

    if (options?.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.severity) {
      queryBuilder.andWhere('log.severity = :severity', { severity: options.severity });
    }

    if (options?.performedBy) {
      queryBuilder.andWhere('log.performedBy = :performedBy', { performedBy: options.performedBy });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: options.endDate });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  async getSecurityEvents(
    communityId: string,
    days: number = 30,
  ): Promise<CommunityAuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditRepository
      .createQueryBuilder('log')
      .where('log.communityId = :communityId', { communityId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .andWhere('log.severity IN (:...severities)', { 
        severities: [CommunityAuditSeverity.HIGH, CommunityAuditSeverity.CRITICAL] 
      })
      .orderBy('log.createdAt', 'DESC')
      .getMany();
  }

  async getModerationStats(
    communityId: string,
    days: number = 30,
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.auditRepository
      .createQueryBuilder('log')
      .select([
        'COUNT(*) as totalActions',
        'COUNT(CASE WHEN log.action = :memberBanned THEN 1 END) as bansCount',
        'COUNT(CASE WHEN log.action = :memberKicked THEN 1 END) as kicksCount',
        'COUNT(CASE WHEN log.action = :memberWarned THEN 1 END) as warningsCount',
        'COUNT(CASE WHEN log.action = :autoModeration THEN 1 END) as autoModerationCount',
      ])
      .where('log.communityId = :communityId', { communityId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .setParameters({
        memberBanned: CommunityAuditAction.MEMBER_BANNED,
        memberKicked: CommunityAuditAction.MEMBER_KICKED,
        memberWarned: CommunityAuditAction.MEMBER_WARNED,
        autoModeration: CommunityAuditAction.AUTO_MODERATION_TRIGGERED,
      })
      .getRawOne();

    return stats;
  }
}
