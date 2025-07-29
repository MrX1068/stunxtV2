import { Processor, Process } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import { SmsService } from '../sms/sms.service';

import { 
  Notification, 
  NotificationType, 
  NotificationStatus 
} from '../../entities/notification.entity';

@Processor('notifications')
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly smsService: SmsService,
  ) {}

  @Process('process-notification')
  async processNotification(job: Job<Notification>) {
    const notification = job.data;
    
    try {
      this.logger.log(`Processing notification: ${notification.id} (${notification.type})`);

      let result: any;

      // Route to appropriate service based on type
      switch (notification.type) {
        case NotificationType.EMAIL:
          result = await this.emailService.sendEmail({
            to: notification.recipient,
            subject: notification.title,
            content: notification.content,
            data: notification.data,
            templateId: notification.templateId,
          });
          break;

        case NotificationType.PUSH:
          result = await this.pushService.sendPushNotification({
            userId: notification.userId,
            title: notification.title,
            body: notification.content,
            data: notification.data,
          });
          break;

        case NotificationType.SMS:
          result = await this.smsService.sendSms({
            to: notification.recipient,
            message: notification.content,
            data: notification.data,
          });
          break;

        case NotificationType.IN_APP:
          // In-app notifications are already stored in database
          result = { success: true, id: notification.id };
          break;

        default:
          throw new Error(`Unsupported notification type: ${notification.type}`);
      }

      // Update notification status on success
      await this.notificationService.updateNotificationStatus(
        notification.id,
        NotificationStatus.SENT,
        {
          externalId: result.id || result.messageId,
          sentAt: new Date(),
        },
      );

      this.logger.log(`Notification sent successfully: ${notification.id}`);

    } catch (error) {
      this.logger.error(`Failed to process notification ${notification.id}:`, error);

      // Update notification status on failure
      await this.notificationService.updateNotificationStatus(
        notification.id,
        NotificationStatus.FAILED,
        {
          errorMessage: error.message,
        },
      );

      // Increment retry count
      await this.incrementRetryCount(notification.id);

      // Re-throw error to trigger Bull retry mechanism
      throw error;
    }
  }

  /**
   * Increment retry count for failed notification
   */
  private async incrementRetryCount(notificationId: string): Promise<void> {
    // This would need a direct repository update
    // For now, we'll log it
    this.logger.warn(`Incrementing retry count for notification: ${notificationId}`);
  }
}
