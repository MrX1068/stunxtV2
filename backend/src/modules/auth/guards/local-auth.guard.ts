import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const errorMessage = info?.message || err?.message || 'Invalid credentials';
      
      throw new UnauthorizedException({
        message: errorMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }

    return user;
  }
}
