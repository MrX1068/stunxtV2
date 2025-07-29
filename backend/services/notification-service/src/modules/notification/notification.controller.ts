import { Controller, Post, Get, Body, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { NotificationService, SendNotificationDto } from './notification.service';
import { NotificationType, NotificationStatus } from '../../entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(ThrottlerGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendNotification(dto);
  }

  @Post('send-template')
  @ApiOperation({ summary: 'Send notification using template' })
  @ApiResponse({ status: 201, description: 'Template notification sent successfully' })
  async sendTemplateNotification(
    @Body() body: {
      userId: string;
      templateKey: string;
      variables: Record<string, any>;
      recipient?: string;
      scheduledAt?: string;
    },
  ) {
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    
    return this.notificationService.sendTemplateNotification(
      body.userId,
      body.templateKey,
      body.variables,
      body.recipient,
      scheduledAt,
    );
  }

  @Post('bulk-send')
  @ApiOperation({ summary: 'Send multiple notifications' })
  @ApiResponse({ status: 201, description: 'Bulk notifications sent successfully' })
  async sendBulkNotifications(@Body() body: { notifications: SendNotificationDto[] }) {
    return this.notificationService.sendBulkNotifications(body.notifications);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: NotificationType,
  ) {
    return this.notificationService.getUserNotifications(userId, page, limit, type);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update notification status' })
  @ApiResponse({ status: 200, description: 'Notification status updated successfully' })
  async updateNotificationStatus(
    @Param('id') id: string,
    @Body() body: { 
      status: NotificationStatus;
      externalId?: string;
      errorMessage?: string;
    },
  ) {
    const metadata: any = {};
    
    if (body.externalId) metadata.externalId = body.externalId;
    if (body.errorMessage) metadata.errorMessage = body.errorMessage;
    
    // Add timestamp based on status
    const now = new Date();
    switch (body.status) {
      case NotificationStatus.SENT:
        metadata.sentAt = now;
        break;
      case NotificationStatus.DELIVERED:
        metadata.deliveredAt = now;
        break;
      case NotificationStatus.OPENED:
        metadata.openedAt = now;
        break;
      case NotificationStatus.CLICKED:
        metadata.clickedAt = now;
        break;
    }

    await this.notificationService.updateNotificationStatus(id, body.status, metadata);
    return { success: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    await this.notificationService.markAsRead(id, userId);
    return { success: true };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Query('userId') userId?: string,
    @Query('days') days: number = 30,
  ) {
    return this.notificationService.getAnalytics(userId, days);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup old notifications' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupOldNotifications(@Body('days') days: number = 90) {
    await this.notificationService.cleanupOldNotifications(days);
    return { success: true };
  }
}
