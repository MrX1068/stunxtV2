import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsUrl, IsEnum, Length, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { CommunityMember } from './community-member.entity';
import { Space } from './space.entity';
import { CommunityInvite } from './community-invite.entity';
import { CommunityAuditLog } from './community-audit-log.entity';

export enum CommunityType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
}

export enum CommunityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum CommunityVerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  PARTNER = 'partner',
}

export enum JoinRequirement {
  OPEN = 'open',
  APPROVAL_REQUIRED = 'approval_required',
  INVITE_ONLY = 'invite_only',
}

@Entity('communities')
@Index(['name'])
@Index(['type'])
@Index(['status'])
@Index(['ownerId'])
export class Community {
  @ApiProperty({ description: 'Unique identifier for the community' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Community name' })
  @Column({ length: 100 })
  @IsNotEmpty({ message: 'Community name is required' })
  @Length(3, 100, { message: 'Community name must be between 3 and 100 characters' })
  name: string;

  @ApiProperty({ description: 'Community URL slug' })
  @Column({ unique: true, length: 50 })
  @IsNotEmpty({ message: 'Community slug is required' })
  @Length(3, 50, { message: 'Community slug must be between 3 and 50 characters' })
  slug: string;

  @ApiPropertyOptional({ description: 'Community description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @ApiPropertyOptional({ description: 'Community cover image URL' })
  @Column({ name: 'cover_image_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid cover image URL' })
  coverImageUrl: string;

  @ApiPropertyOptional({ description: 'Community avatar URL' })
  @Column({ name: 'avatar_url', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid avatar URL' })
  avatarUrl: string;

  @ApiProperty({ description: 'Community type', enum: CommunityType })
  @Column({
    type: 'enum',
    enum: CommunityType,
    default: CommunityType.PUBLIC,
  })
  @IsEnum(CommunityType, { message: 'Invalid community type' })
  type: CommunityType;

  @ApiProperty({ description: 'Community status', enum: CommunityStatus })
  @Column({
    type: 'enum',
    enum: CommunityStatus,
    default: CommunityStatus.ACTIVE,
  })
  @IsEnum(CommunityStatus, { message: 'Invalid community status' })
  status: CommunityStatus;

  @ApiProperty({ description: 'Community owner ID' })
  @Column({ name: 'owner_id' })
  ownerId: string;

  @ApiProperty({ description: 'Member count' })
  @Column({ name: 'member_count', default: 1 })
  memberCount: number;

  @ApiProperty({ description: 'Post count' })
  @Column({ name: 'post_count', default: 0 })
  postCount: number;

  @ApiProperty({ description: 'Community settings in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Community metadata in JSON format' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Record deletion timestamp (soft delete)' })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.ownedCommunities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => CommunityMember, (member) => member.community, {
    cascade: true,
  })
  members: CommunityMember[];

  // Removed spaces and posts relationships for now
  // @OneToMany(() => Space, (space) => space.community, {
  //   cascade: true,
  // })
  // spaces: Space[];

  // @OneToMany(() => Post, (post) => post.community, {
  //   cascade: true,
  // })
  // posts: Post[];

  // Helper methods
  isActive(): boolean {
    return this.status === CommunityStatus.ACTIVE;
  }

  isPublic(): boolean {
    return this.type === CommunityType.PUBLIC;
  }

  isPrivate(): boolean {
    return this.type === CommunityType.PRIVATE;
  }

  isSecret(): boolean {
    return this.type === CommunityType.SECRET;
  }

  canJoin(): boolean {
    return this.isActive() && this.isPublic();
  }

  incrementMemberCount(): void {
    this.memberCount += 1;
  }

  decrementMemberCount(): void {
    if (this.memberCount > 0) {
      this.memberCount -= 1;
    }
  }

  incrementPostCount(): void {
    this.postCount += 1;
  }

  decrementPostCount(): void {
    if (this.postCount > 0) {
      this.postCount -= 1;
    }
  }
}
