import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';

export interface SendPushNotificationDto {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  deviceTokens?: string[];
}

export interface SendWebPushDto {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: Record<string, any>;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp: any;

  constructor(private readonly configService: ConfigService) {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private async initializeFirebase(): Promise<void> {
    try {
      const firebaseConfig = this.configService.get('FIREBASE_CONFIG');
      
      if (!firebaseConfig) {

        return;
      }

      const config = JSON.parse(firebaseConfig);
      
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(config),
      }, 'notification-service');

    
      
    } catch (error) {
    }
  }

  /**
   * Send FCM push notification to specific device tokens
   */
  async sendPushNotification(dto: SendPushNotificationDto): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      if (!dto.deviceTokens || dto.deviceTokens.length === 0) {
        return { success: false, error: 'No device tokens found' };
      }

      const messaging = admin.messaging(this.firebaseApp);

      const message = {
        tokens: dto.deviceTokens,
        notification: {
          title: dto.title,
          body: dto.body,
          imageUrl: dto.imageUrl,
        },
        data: {
          userId: dto.userId,
          actionUrl: dto.actionUrl || '',
          ...dto.data,
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#2563eb',
            sound: 'default',
            clickAction: dto.actionUrl,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          fcmOptions: {
            imageUrl: dto.imageUrl,
          },
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: dto.imageUrl,
          },
          fcmOptions: {
            link: dto.actionUrl,
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);


      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: dto.deviceTokens[idx],
              error: resp.error?.message,
            });
          }
        });
        
      }

      return {
        success: response.successCount > 0,
        results: response.responses,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send web push notification
   */
  async sendWebPushNotification(dto: SendWebPushDto): Promise<{ success: boolean; error?: string }> {
    try {
      const vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY');
      const vapidSubject = this.configService.get('VAPID_SUBJECT', 'mailto:admin@stunxt.com');

      if (!vapidPublicKey || !vapidPrivateKey) {
        throw new Error('VAPID keys not configured');
      }

      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const payload = JSON.stringify(dto.payload);
      await webpush.sendNotification(dto.subscription, payload);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send topic-based notification (for broadcast messages)
   */
  async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = admin.messaging(this.firebaseApp);

      const message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#2563eb',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);

   

      return {
        success: true,
        messageId: response,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe user to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = admin.messaging(this.firebaseApp);
      
      await messaging.subscribeToTopic(deviceTokens, topic);



      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = admin.messaging(this.firebaseApp);
      
      await messaging.unsubscribeFromTopic(deviceTokens, topic);


      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get VAPID public key for web push subscription
   */
  getVapidPublicKey(): string {
    return this.configService.get('VAPID_PUBLIC_KEY', '');
  }

  /**
   * Validate FCM device token
   */
  async validateDeviceToken(token: string): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        return false;
      }

      const messaging = admin.messaging(this.firebaseApp);
      
      // Try to send a dry-run message to validate token
      await messaging.send({
        token,
        data: { test: 'true' },
      }, true); // dry-run mode

      return true;

    } catch (error) {
      return false;
    }
  }
}
