import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { ResponseService } from './services/response.service';
import { CacheService } from './services/cache.service';
import { SlidingWindowRateLimiterService } from './services/sliding-window-rate-limiter.service';
import { ImageTransformService } from './services/image-transform.service';

// Guards
import { RateLimitGuard } from './guards/rate-limit.guard';

// Filters
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// Middleware
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('cache.ttl', 300), // 5 minutes default
        max: configService.get<number>('cache.max', 1000), // 1000 items max
        // Redis configuration if using Redis
        store: configService.get<string>('cache.store', 'memory'),
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password'),
        db: configService.get<number>('redis.db', 0),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Services
    ResponseService,
    CacheService,
    SlidingWindowRateLimiterService,
    ImageTransformService,
    
    // Guards
    RateLimitGuard,
    
    // Filters
    GlobalExceptionFilter,
    
    // Middleware
    CorrelationIdMiddleware,
  ],
  exports: [
    // Export services for use in other modules
    ResponseService,
    CacheService,
    SlidingWindowRateLimiterService,
    ImageTransformService,
    RateLimitGuard,
    GlobalExceptionFilter,
    CorrelationIdMiddleware,
    CacheModule,
  ],
})
export class SharedModule {}
