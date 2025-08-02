import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GrpcFileClient } from './grpc-file.client';
import { User } from '../../shared/entities/user.entity';
import { UserProfile } from '../../shared/entities/user-profile.entity';
import { UserPreferences } from '../../shared/entities/user-preferences.entity';
import { UserStats } from '../../shared/entities/user-stats.entity';
import { UserFollow } from '../../shared/entities/user-follow.entity';
import { UserBlock } from '../../shared/entities/user-block.entity';
import { UserSession } from '../../shared/entities/user-session.entity';
import { ImageTransformService } from '../../shared/services/image-transform.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserPreferences,
      UserStats,
      UserFollow,
      UserBlock,
      UserSession,
    ]),
    // Note: Using global Redis cache from MessagingModule (isGlobal: true)
  ],
  controllers: [UserController],
  providers: [UserService, GrpcFileClient, ImageTransformService],
  exports: [UserService, ImageTransformService],
})
export class UserModule {}
