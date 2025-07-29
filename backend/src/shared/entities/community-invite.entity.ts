import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDate, IsEmail, IsUUID, Length } from 'class-validator';
import { Community } from './community.entity';
import { User } from './user.entity';

export enum CommunityInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum CommunityInviteType {
  EMAIL = 'email',
  LINK = 'link',
  DIRECT = 'direct',
}

@Entity('community_invites')
@Index(['communityId', 'status'])
@Index(['invitedBy'])
@Index(['email'])
@Index(['code'])
@Index(['expiresAt'])
export class CommunityInvite {
  @ApiProperty({ description: 'Community invite ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community ID' })
  @Column({ name: 'community_id' })
  communityId: string;

  @ApiProperty({ description: 'User who created the invite' })
  @Column({ name: 'invited_by' })
  invitedBy: string;

  @ApiPropertyOptional({ description: 'User who was invited (for direct invites)' })
  @Column({ name: 'invited_user_id', nullable: true })
  @IsOptional()
  @IsUUID()
  invitedUserId?: string;

  @ApiPropertyOptional({ description: 'Email address invited (for email invites)' })
  @Column({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiProperty({ description: 'Invite type', enum: CommunityInviteType })
  @Column({
    type: 'enum',
    enum: CommunityInviteType,
    default: CommunityInviteType.DIRECT,
  })
  @IsEnum(CommunityInviteType, { message: 'Invalid invite type' })
  type: CommunityInviteType;

  @ApiProperty({ description: 'Invite status', enum: CommunityInviteStatus })
  @Column({
    type: 'enum',
    enum: CommunityInviteStatus,
    default: CommunityInviteStatus.PENDING,
  })
  @IsEnum(CommunityInviteStatus, { message: 'Invalid invite status' })
  status: CommunityInviteStatus;

  @ApiProperty({ description: 'Unique invite code' })
  @Column({ unique: true })
  @IsString()
  @Length(8, 32, { message: 'Invite code must be 8-32 characters' })
  code: string;

  @ApiPropertyOptional({ description: 'Personal message with the invite' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Message cannot exceed 500 characters' })
  message?: string;

  @ApiPropertyOptional({ description: 'Maximum number of uses (null = unlimited)' })
  @Column({ name: 'max_uses', nullable: true })
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Current number of uses' })
  @Column({ name: 'current_uses', default: 0 })
  currentUses: number;

  @ApiProperty({ description: 'Invite expiration timestamp' })
  @Column({ name: 'expires_at' })
  @IsDate()
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'When invite was accepted' })
  @Column({ name: 'accepted_at', nullable: true })
  @IsOptional()
  @IsDate()
  acceptedAt?: Date;

  @ApiPropertyOptional({ description: 'When invite was declined' })
  @Column({ name: 'declined_at', nullable: true })
  @IsOptional()
  @IsDate()
  declinedAt?: Date;

  @ApiPropertyOptional({ description: 'When invite was rejected' })
  @Column({ name: 'rejected_at', nullable: true })
  @IsOptional()
  @IsDate()
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: 'When invite was revoked' })
  @Column({ name: 'revoked_at', nullable: true })
  @IsOptional()
  @IsDate()
  revokedAt?: Date;

  @ApiPropertyOptional({ description: 'Reason for revocation' })
  @Column({ name: 'revoke_reason', nullable: true })
  @IsOptional()
  @IsString()
  revokeReason?: string;

  @ApiProperty({ description: 'Invite metadata in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Record deletion timestamp (soft delete)' })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_user_id' })
  invitedUser?: User;

  // Helper Methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return (
      this.status === CommunityInviteStatus.PENDING &&
      !this.isExpired() &&
      !this.isAtMaxUses()
    );
  }

  isAtMaxUses(): boolean {
    return this.maxUses !== null && this.currentUses >= this.maxUses;
  }

  canBeUsed(): boolean {
    return this.isValid();
  }

  accept(): void {
    if (!this.canBeUsed()) {
      throw new Error('Invite cannot be accepted');
    }
    
    this.status = CommunityInviteStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.currentUses += 1;
  }

  decline(): void {
    if (this.status !== CommunityInviteStatus.PENDING) {
      throw new Error('Only pending invites can be declined');
    }
    
    this.status = CommunityInviteStatus.DECLINED;
    this.declinedAt = new Date();
  }

  reject(): void {
    if (this.status !== CommunityInviteStatus.PENDING) {
      throw new Error('Only pending invites can be rejected');
    }
    
    this.status = CommunityInviteStatus.REJECTED;
    this.rejectedAt = new Date();
  }

  revoke(reason?: string): void {
    if (this.status === CommunityInviteStatus.ACCEPTED) {
      throw new Error('Accepted invites cannot be revoked');
    }
    
    this.status = CommunityInviteStatus.REVOKED;
    this.revokedAt = new Date();
    if (reason) {
      this.revokeReason = reason;
    }
  }

  markExpired(): void {
    if (this.status === CommunityInviteStatus.PENDING) {
      this.status = CommunityInviteStatus.EXPIRED;
    }
  }

  extendExpiration(hours: number): void {
    if (this.status === CommunityInviteStatus.PENDING) {
      this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
  }

  getRemainingUses(): number {
    if (this.maxUses === null) {
      return Infinity;
    }
    return Math.max(0, this.maxUses - this.currentUses);
  }

  getExpirationText(): string {
    if (this.isExpired()) {
      return 'Expired';
    }
    
    const hoursLeft = Math.ceil((this.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hoursLeft <= 1) {
      return 'Expires in less than 1 hour';
    } else if (hoursLeft <= 24) {
      return `Expires in ${hoursLeft} hours`;
    } else {
      const daysLeft = Math.ceil(hoursLeft / 24);
      return `Expires in ${daysLeft} days`;
    }
  }

  generateNewCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.code = result;
    return result;
  }

  setMaxUses(maxUses: number | null): void {
    this.maxUses = maxUses && maxUses > 0 ? maxUses : null;
  }

  resetUses(): void {
    this.currentUses = 0;
  }

  isEmailInvite(): boolean {
    return this.type === CommunityInviteType.EMAIL && !!this.email;
  }

  isDirectInvite(): boolean {
    return this.type === CommunityInviteType.DIRECT && !!this.invitedUserId;
  }

  isLinkInvite(): boolean {
    return this.type === CommunityInviteType.LINK;
  }
}
