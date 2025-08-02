import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log request
    const isAuthRequest = url.includes('/auth/');
    if (isAuthRequest) {
      this.logger.log(
        `🔐 AUTH REQUEST: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
      );
    } else {
      this.logger.log(
        `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;
          
          if (isAuthRequest) {
            this.logger.log(
              `✅ AUTH SUCCESS: ${method} ${url} - ${statusCode} - ${duration}ms`,
            );
          } else {
            this.logger.log(
              `Outgoing Response: ${method} ${url} - ${statusCode} - ${duration}ms`,
            );
          }
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;
          
          if (statusCode === 401) {
            this.logger.error(
              `🚫 UNAUTHORIZED: ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`,
            );
          } else if (isAuthRequest) {
            this.logger.error(
              `❌ AUTH FAILED: ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`,
            );
          } else {
            this.logger.error(
              `Request Failed: ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`,
            );
          }
        },
      }),
    );
  }
}
