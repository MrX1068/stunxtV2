import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_stats')
@Index(['userId'], { unique: true })
export class UserStats {
  @ApiProperty({ description: 'Unique identifier for the user stats' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User ID these stats belong to' })
  @Column({ name: 'user_id' })
  userId!: string;

  @ApiProperty({ description: 'Number of posts created by user' })
  @Column({ name: 'post_count', default: 0 })
  postCount!: number;

  @ApiProperty({ description: 'Number of followers' })
  @Column({ name: 'follower_count', default: 0 })
  followerCount!: number;

  @ApiProperty({ description: 'Number of users following' })
  @Column({ name: 'following_count', default: 0 })
  followingCount!: number;

  @ApiProperty({ description: 'Number of communities joined' })
  @Column({ name: 'community_count', default: 0 })
  communityCount!: number;

  @ApiProperty({ description: 'Number of comments made' })
  @Column({ name: 'comment_count', default: 0 })
  commentCount!: number;

  @ApiProperty({ description: 'Number of likes received' })
  @Column({ name: 'likes_received_count', default: 0 })
  likesReceivedCount!: number;

  @ApiProperty({ description: 'Number of likes given' })
  @Column({ name: 'likes_given_count', default: 0 })
  likesGivenCount!: number;

  @ApiProperty({ description: 'User reputation score' })
  @Column({ name: 'reputation_score', default: 0 })
  reputationScore!: number;

  @ApiProperty({ description: 'Last activity timestamp' })
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  @ApiProperty({ description: 'Stats creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Stats last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.stats)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Helper methods
  getTotalEngagement(): number {
    return this.postCount + this.commentCount + this.likesGivenCount;
  }

  getEngagementRatio(): number {
    const received = this.likesReceivedCount;
    const given = this.likesGivenCount;
    return given > 0 ? received / given : 0;
  }
}
