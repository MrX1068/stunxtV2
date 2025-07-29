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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_blocks')
@Unique(['blockerId', 'blockedId'])
@Index(['blockerId'])
@Index(['blockedId'])
@Index(['blockedAt'])
export class UserBlock {
  @ApiProperty({ description: 'Unique identifier for the block relationship' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'ID of the user who is blocking' })
  @Column({ name: 'blocker_id' })
  blockerId!: string;

  @ApiProperty({ description: 'ID of the user being blocked' })
  @Column({ name: 'blocked_id' })
  blockedId!: string;

  @ApiProperty({ description: 'When the block was created' })
  @CreateDateColumn({ name: 'blocked_at' })
  blockedAt!: Date;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  @Column({ length: 500, nullable: true })
  reason?: string;

  @ApiProperty({ description: 'Block type - full block or limited', default: 'full' })
  @Column({ name: 'block_type', default: 'full' })
  blockType!: 'full' | 'limited';

  @ApiPropertyOptional({ description: 'Block expiry date (for temporary blocks)' })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Additional block metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata?: any;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked!: User;
}
