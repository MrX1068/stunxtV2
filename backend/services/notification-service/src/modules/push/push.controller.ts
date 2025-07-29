import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PushService, SendPushNotificationDto, SendWebPushDto } from './push.service';

@ApiTags('Push Notifications')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send FCM push notification' })
  @ApiResponse({ status: 201, description: 'Push notification sent successfully' })
  async sendPushNotification(@Body() dto: SendPushNotificationDto) {
    return this.pushService.sendPushNotification(dto);
  }

  @Post('send-web')
  @ApiOperation({ summary: 'Send web push notification' })
  @ApiResponse({ status: 201, description: 'Web push notification sent successfully' })
  async sendWebPushNotification(@Body() dto: SendWebPushDto) {
    return this.pushService.sendWebPushNotification(dto);
  }

  @Post('topic/:topic')
  @ApiOperation({ summary: 'Send notification to topic subscribers' })
  @ApiResponse({ status: 201, description: 'Topic notification sent successfully' })
  async sendTopicNotification(
    @Param('topic') topic: string,
    @Body() body: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    return this.pushService.sendTopicNotification(
      topic,
      body.title,
      body.body,
      body.data,
    );
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe device tokens to topic' })
  @ApiResponse({ status: 201, description: 'Subscribed to topic successfully' })
  async subscribeToTopic(
    @Body() body: {
      deviceTokens: string[];
      topic: string;
    },
  ) {
    return this.pushService.subscribeToTopic(body.deviceTokens, body.topic);
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe device tokens from topic' })
  @ApiResponse({ status: 201, description: 'Unsubscribed from topic successfully' })
  async unsubscribeFromTopic(
    @Body() body: {
      deviceTokens: string[];
      topic: string;
    },
  ) {
    return this.pushService.unsubscribeFromTopic(body.deviceTokens, body.topic);
  }

  @Get('vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for web push' })
  @ApiResponse({ status: 200, description: 'VAPID public key retrieved successfully' })
  async getVapidPublicKey() {
    return {
      publicKey: this.pushService.getVapidPublicKey(),
    };
  }

  @Post('validate-token')
  @ApiOperation({ summary: 'Validate FCM device token' })
  @ApiResponse({ status: 200, description: 'Token validation completed' })
  async validateDeviceToken(@Body('token') token: string) {
    const isValid = await this.pushService.validateDeviceToken(token);
    return { valid: isValid };
  }
}
