import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';

import { 
  Notification, 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority 
} from '../../entities/notification.entity';
import { NotificationTemplate } from '../../entities/template.entity';

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  recipient?: string;
  templateId?: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Send a notification (adds to queue for processing)
   */
  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    try {
      // Create notification record
      const notification = this.notificationRepository.create({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        recipient: dto.recipient,
        templateId: dto.templateId,
        data: dto.data || {},
        priority: dto.priority || NotificationPriority.NORMAL,
        scheduledAt: dto.scheduledAt,
        status: NotificationStatus.PENDING,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Add to queue for processing
      await this.addToQueue(savedNotification);

      this.logger.log(`Notification queued: ${savedNotification.id}`);
      return savedNotification;

    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send notification using template
   */
  async sendTemplateNotification(
    userId: string,
    templateKey: string,
    variables: Record<string, any>,
    recipient?: string,
    scheduledAt?: Date,
  ): Promise<Notification> {
    const template = await this.templateRepository.findOne({
      where: { key: templateKey, isActive: true },
    });

    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Compile template with variables
    const { title, content } = await this.compileTemplate(template, variables);

    return this.sendNotification({
      userId,
      type: this.mapTemplateTypeToNotificationType(template.type),
      title,
      content,
      recipient,
      templateId: template.id,
      data: variables,
      scheduledAt,
    });
  }

  /**
   * Bulk send notifications
   */
  async sendBulkNotifications(notifications: SendNotificationDto[]): Promise<Notification[]> {
    const results = [];
    
    for (const notificationDto of notifications) {
      try {
        const notification = await this.sendNotification(notificationDto);
        results.push(notification);
      } catch (error) {
        this.logger.error(`Failed to send bulk notification:`, error);
        // Continue with other notifications
      }
    }

    return results;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: NotificationType,
  ) {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    metadata?: Partial<{
      externalId: string;
      errorMessage: string;
      sentAt: Date;
      deliveredAt: Date;
      openedAt: Date;
      clickedAt: Date;
    }>,
  ): Promise<void> {
    const updateData: any = { status };

    if (metadata) {
      Object.assign(updateData, metadata);
    }

    await this.notificationRepository.update(notificationId, updateData);
    
    this.logger.log(`Notification ${notificationId} status updated to ${status}`);
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(userId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.createdAt >= :startDate', { startDate });

    if (userId) {
      query.andWhere('notification.userId = :userId', { userId });
    }

    // Get counts by status
    const statusStats = await query
      .select('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.status')
      .getRawMany();

    // Get counts by type
    const typeStats = await query
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type')
      .getRawMany();

    // Get daily stats
    const dailyStats = await query
      .select('DATE(notification.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('DATE(notification.createdAt)')
      .orderBy('DATE(notification.createdAt)', 'DESC')
      .getRawMany();

    return {
      statusStats,
      typeStats,
      dailyStats,
      totalNotifications: statusStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.status === NotificationStatus.SENT) {
      await this.updateNotificationStatus(
        notificationId,
        NotificationStatus.OPENED,
        { openedAt: new Date() },
      );
    }
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(days: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old notifications`);
  }

  /**
   * Add notification to processing queue
   */
  private async addToQueue(notification: Notification): Promise<void> {
    const jobOptions: any = {
      priority: this.getPriorityValue(notification.priority),
      delay: notification.scheduledAt ? 
        Math.max(0, notification.scheduledAt.getTime() - Date.now()) : 0,
    };

    await this.notificationQueue.add('process-notification', notification, jobOptions);
  }

  /**
   * Compile template with variables
   */
  private async compileTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): Promise<{ title: string; content: string }> {
    // Simple template compilation (you can use Handlebars here)
    let title = template.subject;
    let content = template.template;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      title = title.replace(regex, String(value));
      content = content.replace(regex, String(value));
    });

    return { title, content };
  }

  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 10;
      case NotificationPriority.HIGH:
        return 5;
      case NotificationPriority.NORMAL:
        return 0;
      case NotificationPriority.LOW:
        return -5;
      default:
        return 0;
    }
  }

  /**
   * Map template type to notification type
   */
  private mapTemplateTypeToNotificationType(templateType: any): NotificationType {
    switch (templateType) {
      case 'EMAIL':
      case 'email':
        return NotificationType.EMAIL;
      case 'PUSH':
      case 'push':
        return NotificationType.PUSH;
      case 'SMS':
      case 'sms':
        return NotificationType.SMS;
      case 'IN_APP':
      case 'in_app':
        return NotificationType.IN_APP;
      default:
        return NotificationType.EMAIL; // Default fallback
    }
  }
}
