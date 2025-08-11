import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Check if correlation ID already exists in request headers
    let correlationId = req.headers['x-correlation-id'] as string;
    
    // Generate new correlation ID if not provided
    if (!correlationId) {
      correlationId = uuidv4();
    }

    // Store correlation ID in request object for use throughout the request lifecycle
    (req as any).correlationId = correlationId;

    // Add correlation ID to response headers for client tracking
    res.setHeader('X-Correlation-ID', correlationId);

    // Continue to next middleware
    next();
  }
}
