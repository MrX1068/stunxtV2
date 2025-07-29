import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_follows')
@Unique(['followerId', 'followingId'])
@Index(['followerId'])
@Index(['followingId'])
@Index(['followedAt'])
export class UserFollow {
  @ApiProperty({ description: 'Unique identifier for the follow relationship' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'ID of the user who is following' })
  @Column({ name: 'follower_id' })
  followerId!: string;

  @ApiProperty({ description: 'ID of the user being followed' })
  @Column({ name: 'following_id' })
  followingId!: string;

  @ApiProperty({ description: 'When the follow relationship was created' })
  @CreateDateColumn({ name: 'followed_at' })
  followedAt!: Date;

  @ApiProperty({ description: 'Follow notification enabled', default: true })
  @Column({ name: 'notification_enabled', default: true })
  notificationEnabled!: boolean;

  @ApiProperty({ description: 'Additional follow metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata?: any;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following!: User;
}
