import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
