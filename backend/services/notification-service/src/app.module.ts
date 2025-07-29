import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
// NestJS 11 breaking change - proper Redis cache handling
import KeyvRedis from '@keyv/redis';

import { NotificationModule } from './modules/notification/notification.module';
import { EmailModule } from './modules/email/email.module';
import { PushModule } from './modules/push/push.module';
import { SmsModule } from './modules/sms/sms.module';
import { TemplateModule } from './modules/template/template.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WebhookModule } from './modules/webhook/webhook.module';

import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // Redis & Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: redisConfig,
      inject: [ConfigService],
    }),

    // Cache Management (NestJS 11 compliant with Keyv Redis)
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        const redisUrl = `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`;
        
        return {
          stores: [
            new KeyvRedis(redisUrl),
          ],
          ttl: 300000, // 5 minutes in milliseconds
        };
      },
      inject: [ConfigService],
    }),

    // Rate Limiting (Consistent with main backend)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [{
          name: 'default',
          ttl: 60000, // 1 minute
          limit: configService.get('NODE_ENV') === 'production' ? 100 : 1000, // Standard limit for notifications
        }],
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    NotificationModule,
    EmailModule,
    PushModule,
    SmsModule,
    TemplateModule,
    AnalyticsModule,
    WebhookModule,
  ],
})
export class AppModule {}
