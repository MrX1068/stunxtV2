import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { NotificationModule } from '../notification/notification.module';
import { Notification } from '../../entities/notification.entity';
import { NotificationTemplate } from '../../entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate]),
    NotificationModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
