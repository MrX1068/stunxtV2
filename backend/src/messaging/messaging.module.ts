import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
// UPDATED: Following official NestJS docs with Keyv Redis
import KeyvRedis from '@keyv/redis';

// Entities
import { Message } from '../shared/entities/message.entity';
import { MessageReaction } from '../shared/entities/message-reaction.entity';
import { Conversation } from '../shared/entities/conversation.entity';
import { ConversationParticipant } from '../shared/entities/conversation-participant.entity';
import { User } from '../shared/entities/user.entity';

// Services
import { MessageService } from './message.service';
import { ConversationService } from './conversation.service';

// Controllers
import { MessageController } from './message.controller';
import { ConversationController } from './conversation.controller';

// Gateway
import { MessagingGateway } from './messaging.gateway';

// Guards
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      Message,
      MessageReaction,
      Conversation,
      ConversationParticipant,
      User,
    ]),

    // Event system for real-time functionality
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Redis cache for enterprise performance (Latest NestJS docs approach)
    CacheModule.registerAsync({
      imports: [ConfigModule],
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
      isGlobal: true,
    }),

    // JWT for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [
    MessageController,
    ConversationController,
  ],

  providers: [
    // Core services
    MessageService,
    ConversationService,
    
    // WebSocket gateway
    MessagingGateway,
    
    // Guards
    JwtAuthGuard,
  ],

  exports: [
    // Export services for use in other modules
    MessageService,
    ConversationService,
    MessagingGateway,
    TypeOrmModule,
  ],
})
export class MessagingModule {
  constructor() {
   
  }
}
