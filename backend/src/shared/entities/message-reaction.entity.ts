import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('message_reactions')
@Index(['messageId'])
@Index(['userId'])
@Index(['emoji'])
@Index(['createdAt'])
export class MessageReaction {
  @ApiProperty({ description: 'Unique identifier for the reaction' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Message ID' })
  @Column({ name: 'message_id' })
  @Index()
  messageId!: string;

  @ApiProperty({ description: 'User ID who reacted' })
  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @ApiProperty({ description: 'Emoji reaction' })
  @Column({ length: 10 })
  @IsNotEmpty({ message: 'Emoji is required' })
  @Length(1, 10, { message: 'Emoji must be between 1 and 10 characters' })
  @Index()
  emoji!: string;

  @ApiProperty({ description: 'Reaction metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @ApiProperty({ description: 'Reaction creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  // Relationships
//   @ManyToOne(() => Message, (message) => message.reactions, {
//     onDelete: 'CASCADE',
//   })
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
