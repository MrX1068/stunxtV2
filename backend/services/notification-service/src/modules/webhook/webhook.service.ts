import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationStatus } from '../../entities/notification.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Handle Brevo webhook events
   */
  async handleBrevoWebhook(event: any): Promise<void> {
    try {
      

      const messageId = event['message-id'];
      if (!messageId) {
        return;
      }

      let status: NotificationStatus;
      let metadata: any = {};

      switch (event.event) {
        case 'delivered':
          status = NotificationStatus.DELIVERED;
          metadata.deliveredAt = new Date(event.ts * 1000);
          break;
        case 'opened':
          status = NotificationStatus.OPENED;
          metadata.openedAt = new Date(event.ts * 1000);
          break;
        case 'click':
          status = NotificationStatus.CLICKED;
          metadata.clickedAt = new Date(event.ts * 1000);
          break;
        case 'bounce':
        case 'hard_bounce':
        case 'soft_bounce':
          status = NotificationStatus.BOUNCED;
          metadata.errorMessage = event.reason || 'Email bounced';
          break;
        case 'blocked':
        case 'spam':
          status = NotificationStatus.FAILED;
          metadata.errorMessage = event.reason || 'Email blocked';
          break;
        default:
          this.logger.warn(`Unknown Brevo event: ${event.event}`);
          return;
      }

      // Update notification status
      await this.updateNotificationByExternalId(messageId, status, metadata);

    } catch (error) {

    }
  }

  /**
   * Handle FCM webhook/callback events
   */
  async handleFCMWebhook(event: any): Promise<void> {
    try {
   

      // FCM doesn't provide direct delivery webhooks
      // This would be for handling registration token updates
      // or other FCM-related events

    } catch (error) {
      this.logger.error('Error processing FCM webhook:', error);
    }
  }

  /**
   * Handle Twilio webhook events
   */
  async handleTwilioWebhook(event: any): Promise<void> {
    try {

      const messageSid = event.MessageSid || event.SmsSid;
      if (!messageSid) {
        this.logger.warn('No message SID in Twilio webhook');
        return;
      }

      let status: NotificationStatus;
      let metadata: any = {};

      switch (event.MessageStatus || event.SmsStatus) {
        case 'sent':
          status = NotificationStatus.SENT;
          metadata.sentAt = new Date();
          break;
        case 'delivered':
          status = NotificationStatus.DELIVERED;
          metadata.deliveredAt = new Date();
          break;
        case 'failed':
        case 'undelivered':
          status = NotificationStatus.FAILED;
          metadata.errorMessage = event.ErrorMessage || 'SMS failed';
          break;
        default:
          this.logger.warn(`Unknown Twilio status: ${event.MessageStatus || event.SmsStatus}`);
          return;
      }

      // Update notification status
      await this.updateNotificationByExternalId(messageSid, status, metadata);

    } catch (error) {
      this.logger.error('Error processing Twilio webhook:', error);
    }
  }

  /**
   * Update notification status by external ID
   */
  private async updateNotificationByExternalId(
    externalId: string,
    status: NotificationStatus,
    metadata: any,
  ): Promise<void> {
    try {
      // Note: This would require a method to find notification by external ID
      // For now, we'll log it
      this.logger.log(`Updating notification with external ID ${externalId} to status ${status}`);
      
      // TODO: Implement notification lookup by external ID and update
      // await this.notificationService.updateNotificationByExternalId(externalId, status, metadata);

    } catch (error) {
      this.logger.error(`Failed to update notification ${externalId}:`, error);
    }
  }
}
