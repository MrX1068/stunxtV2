import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { SlidingWindowRateLimiterService, RateLimitConfig } from '../services/sliding-window-rate-limiter.service';
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions extends Omit<RateLimitConfig, 'keyGenerator'> {
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  message?: string;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit decorators
export const LoginRateLimit = () => RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => req.ip,
});

export const ApiRateLimit = (strict = false) => RateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: strict ? 20 : 100,
  message: 'Too many API requests, please try again later',
  keyGenerator: (req) => (req as any).user?.id || req.ip,
});

export const MessageRateLimit = () => RateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Too many messages, please slow down',
  keyGenerator: (req) => (req as any).user?.id || req.ip,
});

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: SlidingWindowRateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if request should be skipped
    if (rateLimitOptions.skipIf && rateLimitOptions.skipIf(request)) {
      return true;
    }

    // Generate rate limit key
    const identifier = rateLimitOptions.keyGenerator ? 
      rateLimitOptions.keyGenerator(request) : 
      this.getDefaultIdentifier(request);

    // Create RateLimitConfig from RateLimitOptions
    const rateLimitConfig: RateLimitConfig = {
      windowMs: rateLimitOptions.windowMs,
      maxRequests: rateLimitOptions.maxRequests,
      skipSuccessfulRequests: rateLimitOptions.skipSuccessfulRequests,
      skipFailedRequests: rateLimitOptions.skipFailedRequests,
      // Transform keyGenerator to work with string identifier instead of Request
      keyGenerator: rateLimitOptions.keyGenerator ?
        (id: string) => `custom:${id}` :
        undefined,
    };

    // Check rate limit
    const result = await this.rateLimiter.isRateLimited(identifier, rateLimitConfig);

    // Add rate limit headers to response
    this.addRateLimitHeaders(response, result, rateLimitOptions);

    if (!result.allowed) {
      const message = rateLimitOptions.message || 'Too many requests';
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          error: 'Too Many Requests',
          retryAfter: Math.ceil(result.timeToReset / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getDefaultIdentifier(request: Request): string {
    // Try to get user ID first, fall back to IP
    const user = (request as any).user;
    return user?.id || request.ip || 'anonymous';
  }

  private addRateLimitHeaders(
    response: Response,
    result: any,
    options: RateLimitOptions,
  ): void {
    response.setHeader('X-RateLimit-Limit', options.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remainingRequests);
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.timeToReset).toISOString());
    response.setHeader('X-RateLimit-Window', options.windowMs);

    if (!result.allowed) {
      response.setHeader('Retry-After', Math.ceil(result.timeToReset / 1000));
    }
  }
}
