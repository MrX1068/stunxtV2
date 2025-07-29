import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
