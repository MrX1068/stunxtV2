import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StandardApiResponse, ResponseMetadata } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    
    return next.handle().pipe(
      map((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const metadata: ResponseMetadata = {
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          requestId: request.headers['x-request-id'] || undefined,
          duration,
        };

        // If data is already a StandardApiResponse, return it as-is
        if (data && typeof data === 'object' && 'success' in data && 'metadata' in data) {
          return {
            ...data,
            metadata: {
              ...metadata,
              ...data.metadata,
            },
          };
        }

        // If data is null or undefined, return success with no data
        if (data === null || data === undefined) {
          return {
            success: true,
            metadata,
          };
        }

        // For regular data, wrap it in standard format
        return {
          success: true,
          data,
          metadata,
        };
      }),
    );
  }
}
