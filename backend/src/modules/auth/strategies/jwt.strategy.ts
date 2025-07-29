import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { UserSessionService } from '../user-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userSessionService: UserSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Verify payload structure
    if (!payload.sub || !payload.email || !payload.sessionId || payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Get user by ID (use the validate method that sanitizes)
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('User not found or session invalid');
    }

    // Update session activity
    await this.userSessionService.updateSessionActivity(payload.sessionId, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Return ONLY safe user data (no sensitive information)
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.websiteUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sessionId: payload.sessionId, // Include session ID for logout, etc.
    };
  }
}
