import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification, NotificationStatus, NotificationType } from '../../entities/notification.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getOverallStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.createdAt >= :startDate', { startDate });

    const [
      totalNotifications,
      sentNotifications,
      deliveredNotifications,
      openedNotifications,
      failedNotifications,
    ] = await Promise.all([
      query.getCount(),
      query.andWhere('notification.status = :status', { status: NotificationStatus.SENT }).getCount(),
      query.andWhere('notification.status = :status', { status: NotificationStatus.DELIVERED }).getCount(),
      query.andWhere('notification.status = :status', { status: NotificationStatus.OPENED }).getCount(),
      query.andWhere('notification.status = :status', { status: NotificationStatus.FAILED }).getCount(),
    ]);

    const deliveryRate = totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0;
    const openRate = sentNotifications > 0 ? (openedNotifications / sentNotifications) * 100 : 0;
    const failureRate = totalNotifications > 0 ? (failedNotifications / totalNotifications) * 100 : 0;

    return {
      totalNotifications,
      sentNotifications,
      deliveredNotifications,
      openedNotifications,
      failedNotifications,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  async getTypeBreakdown(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.createdAt >= :startDate', { startDate })
      .groupBy('notification.type')
      .getRawMany();
  }

  async getDailyStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.notificationRepository
      .createQueryBuilder('notification')
      .select('DATE(notification.createdAt)', 'date')
      .addSelect('notification.type', 'type')
      .addSelect('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('notification.createdAt >= :startDate', { startDate })
      .groupBy('DATE(notification.createdAt), notification.type, notification.status')
      .orderBy('DATE(notification.createdAt)', 'DESC')
      .getRawMany();
  }
}
