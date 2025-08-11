import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    correlationId: string;
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
  };
  data: null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const correlationId = this.getOrCreateCorrelationId(request);
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let details: any = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(statusCode);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        errorCode = responseObj.code || this.getErrorCodeFromStatus(statusCode);
        details = responseObj.details || null;
      } else {
        message = exception.message;
        errorCode = this.getErrorCodeFromStatus(statusCode);
      }
    } else if (exception instanceof QueryFailedError) {
      // Database errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'DATABASE_ERROR';
      message = 'Database operation failed';
      details = this.sanitizeDatabaseError(exception);
    } else if (exception instanceof Error) {
      // Generic errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      details = process.env.NODE_ENV === 'development' ? exception.stack : null;
    } else {
      // Unknown errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'UNKNOWN_ERROR';
      message = 'An unknown error occurred';
    }

    // Create standardized error response
    const errorResponse: StandardErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        correlationId,
        timestamp,
        path,
        method,
        statusCode,
      },
      data: null,
    };

    // Log the error with context
    this.logError(exception, correlationId, request, errorResponse);

    // Send response
    response.status(statusCode).json(errorResponse);
  }

  private getOrCreateCorrelationId(request: Request): string {
    // Check if correlation ID already exists in headers
    const existingId = request.headers['x-correlation-id'] as string;
    if (existingId) {
      return existingId;
    }

    // Generate new correlation ID
    const correlationId = uuidv4();
    
    // Store in request for potential use by other middleware
    (request as any).correlationId = correlationId;
    
    return correlationId;
  }

  private getErrorCodeFromStatus(statusCode: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  private sanitizeDatabaseError(error: QueryFailedError): any {
    // Remove sensitive information from database errors
    const sanitized: any = {
      code: (error as any).code,
      constraint: (error as any).constraint,
      table: (error as any).table,
      column: (error as any).column,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      sanitized.detail = (error as any).detail;
      sanitized.hint = (error as any).hint;
    }

    return sanitized;
  }

  private logError(
    exception: unknown,
    correlationId: string,
    request: Request,
    errorResponse: StandardErrorResponse,
  ): void {
    const logContext = {
      correlationId,
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.id,
      statusCode: errorResponse.error.statusCode,
      errorCode: errorResponse.error.code,
    };

    if (errorResponse.error.statusCode >= 500) {
      // Server errors - log as error with full details
      this.logger.error(
        `${errorResponse.error.code}: ${errorResponse.error.message}`,
        {
          exception: exception instanceof Error ? exception.stack : exception,
          context: logContext,
        },
      );
    } else if (errorResponse.error.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `${errorResponse.error.code}: ${errorResponse.error.message}`,
        logContext,
      );
    } else {
      // Other errors - log as debug
      this.logger.debug(
        `${errorResponse.error.code}: ${errorResponse.error.message}`,
        logContext,
      );
    }
  }
}
