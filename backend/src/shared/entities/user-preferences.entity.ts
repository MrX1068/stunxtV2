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

export interface NotificationTypes {
  mentions?: boolean;
  comments?: boolean;
  reactions?: boolean;
  follows?: boolean;
  messages?: boolean;
  posts?: boolean;
  communities?: boolean;
  announcements?: boolean;
}

export interface PrivacySettings {
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  showOnlineStatus?: boolean;
  allowSearchByEmail?: boolean;
  allowSearchByPhone?: boolean;
}

export interface ContentPreferences {
  showNsfw?: boolean;
  showSpoilers?: boolean;
  autoplayVideos?: boolean;
  autoplayGifs?: boolean;
  showRecommendations?: boolean;
}

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreferences {
  @ApiProperty({ description: 'Unique identifier for the user preferences' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User ID these preferences belong to' })
  @Column({ name: 'user_id' })
  userId!: string;

  @ApiProperty({ description: 'Theme preference', default: 'auto' })
  @Column({ default: 'auto' })
  theme!: 'light' | 'dark' | 'auto';

  @ApiProperty({ description: 'Language preference', default: 'en' })
  @Column({ default: 'en' })
  language!: string;

  @ApiProperty({ description: 'Timezone preference', default: 'UTC' })
  @Column({ default: 'UTC' })
  timezone!: string;

  @ApiProperty({ description: 'Email notifications enabled', default: true })
  @Column({ name: 'email_notifications', default: true })
  emailNotifications!: boolean;

  @ApiProperty({ description: 'Push notifications enabled', default: true })
  @Column({ name: 'push_notifications', default: true })
  pushNotifications!: boolean;

  @ApiProperty({ description: 'SMS notifications enabled', default: false })
  @Column({ name: 'sms_notifications', default: false })
  smsNotifications!: boolean;

  @ApiProperty({ description: 'Notification type preferences' })
  @Column({ name: 'notification_types', type: 'jsonb', default: {} })
  notificationTypes!: NotificationTypes;

  @ApiProperty({ description: 'Privacy settings' })
  @Column({ name: 'privacy_settings', type: 'jsonb', default: {} })
  privacySettings!: PrivacySettings;

  @ApiProperty({ description: 'Content preferences' })
  @Column({ name: 'content_preferences', type: 'jsonb', default: {} })
  contentPreferences!: ContentPreferences;

  @ApiProperty({ description: 'Additional preferences metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata?: any;

  @ApiProperty({ description: 'Preferences creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Preferences last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
