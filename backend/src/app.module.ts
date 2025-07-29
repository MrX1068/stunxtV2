import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import emailConfig from './config/email.config';

// Entity imports
import { User } from './shared/entities/user.entity';
import { Community } from './shared/entities/community.entity';
import { CommunityMember } from './shared/entities/community-member.entity';
import { CommunityInvite } from './shared/entities/community-invite.entity';
import { CommunityAuditLog } from './shared/entities/community-audit-log.entity';
import { Space } from './shared/entities/space.entity';
import { SpaceMember } from './shared/entities/space-member.entity';
import { UserSession } from './shared/entities/user-session.entity';
import { LoginAttempt } from './shared/entities/login-attempt.entity';
import { Conversation } from './shared/entities/conversation.entity';
import { ConversationParticipant } from './shared/entities/conversation-participant.entity';
import { Message } from './shared/entities/message.entity';
import { Post } from './shared/entities/post.entity';
import { PostComment } from './shared/entities/post-comment.entity';
import { PostReaction } from './shared/entities/post-reaction.entity';
import { PostTag } from './shared/entities/post-tag.entity';
import { PostMedia } from './shared/entities/post-media.entity';
import { UserProfile } from './shared/entities/user-profile.entity';
import { UserPreferences } from './shared/entities/user-preferences.entity';
import { UserFollow } from './shared/entities/user-follow.entity';
import { UserBlock } from './shared/entities/user-block.entity';

// Module imports
import { AuthModule } from './modules/auth/auth.module';
import { CommunityModule } from './modules/community/community.module';
import { SpaceModule } from './modules/space/space.module';
import { MessagingModule } from './messaging/messaging.module';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './modules/users/user.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, emailConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [
            User,
            Community,
            CommunityMember,
            CommunityInvite,
            CommunityAuditLog,
            Space,
            SpaceMember,
            UserSession,
            LoginAttempt,
            Conversation,
            ConversationParticipant,
            Message,
            Post,
            PostComment,
            PostReaction,
            PostTag,
            PostMedia,
            UserProfile,
            UserPreferences,
            UserFollow,
            UserBlock,
          ],
          synchronize: dbConfig.synchronize,
        //   dropSchema: true, // Temporarily enable to clear existing schema
          logging: dbConfig.logging,
          retryAttempts: dbConfig.retryAttempts,
          retryDelay: dbConfig.retryDelay,
          maxQueryExecutionTime: dbConfig.maxQueryExecutionTime,
        };
      },
      inject: [ConfigService],
    }),

    // Rate Limiting (NestJS 11 Breaking Change - Fixed)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [{
          name: 'default',
          ttl: 60000, // 1 minute
          limit: configService.get('app.env') === 'production' ? 100 : 1000,
        }],
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    CommunityModule,
    SpaceModule,
    MessagingModule,
    PostsModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
