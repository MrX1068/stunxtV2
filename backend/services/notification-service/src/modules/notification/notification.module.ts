import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';
import { SmsModule } from '../sms/sms.module';

import { Notification } from '../../entities/notification.entity';
import { NotificationTemplate } from '../../entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    EmailModule,
    PushModule,
    SmsModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
