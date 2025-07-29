import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TemplateType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
}

@Entity('notification_templates')
@Index(['type', 'isActive'])
@Index(['key'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255, unique: true })
  key: string; // welcome_email, post_liked, etc.

  @Column('varchar', { length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
  })
  type: TemplateType;

  @Column('varchar', { length: 500 })
  subject: string; // For email/push title

  @Column('text')
  template: string; // Handlebars template

  @Column('json', { nullable: true })
  variables: string[]; // Required template variables

  @Column('json', { nullable: true })
  metadata: Record<string, any>; // Additional config

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('varchar', { length: 255, nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
