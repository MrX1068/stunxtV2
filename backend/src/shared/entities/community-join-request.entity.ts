import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { Community } from './community.entity';

export enum JoinRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('community_join_requests')
@Index(['communityId', 'userId'], { unique: true })
@Index(['communityId', 'status'])
@Index(['userId', 'status'])
export class CommunityJoinRequest {
  @ApiProperty({ description: 'Join request ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community ID' })
  @Column({ name: 'community_id' })
  @IsNotEmpty()
  communityId: string;

  @ApiProperty({ description: 'User ID who requested to join' })
  @Column({ name: 'user_id' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Join request status', enum: JoinRequestStatus })
  @Column({
    type: 'enum',
    enum: JoinRequestStatus,
    default: JoinRequestStatus.PENDING,
  })
  status: JoinRequestStatus;

  @ApiPropertyOptional({ description: 'Request message from user' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 500)
  message?: string;

  @ApiPropertyOptional({ description: 'Admin response message' })
  @Column({ name: 'admin_response', type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 500)
  adminResponse?: string;

  @ApiPropertyOptional({ description: 'Admin who processed the request' })
  @Column({ name: 'processed_by', nullable: true })
  processedBy?: string;

  @ApiPropertyOptional({ description: 'When the request was processed' })
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;

  @ApiProperty({ description: 'When the request was created' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'When the request was last updated' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Community, (community) => community.joinRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by' })
  processedByUser?: User;

  // Helper Methods
  isPending(): boolean {
    return this.status === JoinRequestStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === JoinRequestStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === JoinRequestStatus.REJECTED;
  }

  isCancelled(): boolean {
    return this.status === JoinRequestStatus.CANCELLED;
  }

  canBeProcessed(): boolean {
    return this.status === JoinRequestStatus.PENDING;
  }
}
