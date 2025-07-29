import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['type', 'status'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column('varchar', { length: 500 })
  title: string;

  @Column('text')
  content: string;

  @Column('json', { nullable: true })
  data: Record<string, any>;

  @Column('varchar', { length: 255, nullable: true })
  templateId: string;

  @Column('varchar', { length: 255, nullable: true })
  externalId: string; // Provider message ID

  @Column('varchar', { length: 255, nullable: true })
  recipient: string; // Email, phone, or device token

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('int', { default: 0 })
  retryCount: number;

  @Column('timestamp', { nullable: true })
  scheduledAt: Date;

  @Column('timestamp', { nullable: true })
  sentAt: Date;

  @Column('timestamp', { nullable: true })
  deliveredAt: Date;

  @Column('timestamp', { nullable: true })
  openedAt: Date;

  @Column('timestamp', { nullable: true })
  clickedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
