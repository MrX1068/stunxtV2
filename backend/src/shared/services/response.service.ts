import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  StandardApiResponse,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  PaginatedData,
  PaginationMetadata,
  ResponseMetadata
} from '../interfaces/api-response.interface';

@Injectable()
export class ResponseService {
  
  /**
   * Create a success response
   */
  success<T>(
    data: T,
    message?: string,
    request?: Request,
    metadata?: Partial<ResponseMetadata>
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: this.createMetadata(request, metadata),
    };
  }

  /**
   * Create an error response
   */
  error(
    message: string,
    errors?: string[],
    request?: Request,
    metadata?: Partial<ResponseMetadata>
  ): ErrorResponse {
    return {
      success: false,
      message,
      errors,
      metadata: this.createMetadata(request, metadata),
    };
  }

  /**
   * Create a paginated response
   */
  paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
    request?: Request,
    metadata?: Partial<ResponseMetadata>
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    const paginatedData: PaginatedData<T> = {
      items,
      pagination,
    };

    return {
      success: true,
      data: paginatedData,
      message,
      metadata: this.createMetadata(request, { pagination, ...metadata }),
    };
  }

  /**
   * Create a simple success response with no data
   */
  ok(message?: string, request?: Request, metadata?: Partial<ResponseMetadata>): StandardApiResponse<void> {
    return {
      success: true,
      message,
      metadata: this.createMetadata(request, metadata),
    };
  }

  /**
   * Create pagination metadata from query params
   */
  createPagination(
    total: number,
    page: number = 1,
    limit: number = 10
  ): PaginationMetadata {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page: Math.max(1, page),
      limit: Math.max(1, limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Extract pagination params from query
   */
  extractPaginationParams(query: any): { page: number; limit: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));

    return { page, limit };
  }

  /**
   * Create response metadata with correlation ID
   */
  private createMetadata(request?: Request, metadata?: Partial<ResponseMetadata>): ResponseMetadata {
    const correlationId = request ?
      ((request as any).correlationId || request.headers['x-correlation-id'] as string) :
      'unknown';

    return {
      timestamp: new Date().toISOString(),
      path: request?.url || '',
      method: request?.method || '',
      correlationId,
      ...metadata,
    };
  }
}
