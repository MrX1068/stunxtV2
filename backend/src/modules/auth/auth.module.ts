import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserSessionService } from './user-session.service';
import { LoginAttemptService } from './login-attempt.service';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { ResponseService } from '../../shared/services/response.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { User } from '../../shared/entities/user.entity';
import { UserSession } from '../../shared/entities/user-session.entity';
import { LoginAttempt } from '../../shared/entities/login-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession, LoginAttempt]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiresIn'),
          issuer: configService.get<string>('jwt.issuer'),
          audience: configService.get<string>('jwt.audience'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [{
          ttl: configService.get<number>('rateLimit.authTtl', 60000),
          limit: configService.get<number>('rateLimit.authLimit', 10),
        }],
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserSessionService,
    LoginAttemptService,
    OtpService,
    EmailService,
    ResponseService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    UserSessionService,
    LoginAttemptService,
    OtpService,
    EmailService,
    JwtAuthGuard,
    PassportModule,
  ],
})
export class AuthModule {}
