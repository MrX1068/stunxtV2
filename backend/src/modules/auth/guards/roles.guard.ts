import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../shared/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => {
      switch (role) {
        case UserRole.SUPER_ADMIN:
          return user.role === UserRole.SUPER_ADMIN;
        case UserRole.ADMIN:
          return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
        case UserRole.MODERATOR:
          return (
            user.role === UserRole.MODERATOR ||
            user.role === UserRole.ADMIN ||
            user.role === UserRole.SUPER_ADMIN
          );
        case UserRole.USER:
          return true; // All authenticated users have user role
        default:
          return false;
      }
    });

    if (!hasRole) {
      throw new ForbiddenException({
        message: 'Insufficient privileges to access this resource',
        requiredRoles,
        userRole: user.role,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }

    return true;
  }
}
