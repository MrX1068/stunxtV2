import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
// NestJS 11 breaking change - proper Redis cache handling
import KeyvRedis from '@keyv/redis';

// Configuration
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { fileServiceConfig } from './config/file-service.config';

// Modules
import { UploadModule } from './modules/upload/upload.module';

// Global services
import { CloudinaryProvider } from './providers/cloudinary/cloudinary.provider';
import { AwsS3Provider } from './providers/aws-s3/aws-s3.provider';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [fileServiceConfig],
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
          limit: configService.get('NODE_ENV') === 'production' ? 200 : 1000, // Higher limit for file operations
        }],
      }),
      inject: [ConfigService],
    }),

    // JWT for authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    UploadModule,
  ],
  providers: [
    CloudinaryProvider,
    AwsS3Provider,
  ],
})
export class AppModule {}
