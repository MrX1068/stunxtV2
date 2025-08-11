import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // First, run the standard JWT validation
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Additional security: Check token blacklist
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (token) {
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException({
          message: 'Token has been revoked',
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        });
      }

      // Check if user is globally blacklisted
      const user = request.user;
      if (user?.id) {
        const isUserBlacklisted = await this.tokenBlacklistService.isUserBlacklisted(user.id);
        if (isUserBlacklisted) {
          throw new UnauthorizedException({
            message: 'User access has been revoked',
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
          });
        }
      }
    }

    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const errorMessage = info?.message || err?.message || 'Unauthorized access';

      throw new UnauthorizedException({
        message: errorMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }

    return user;
  }

  /**
   * Extract JWT token from Authorization header
   */
  private extractTokenFromHeader(request: any): string | null {
    const authorization = request.headers?.authorization;
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
