import { Injectable } from '@nestjs/common';
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
    metadata?: Partial<ResponseMetadata>
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        path: '',
        method: '',
        ...metadata,
      },
    };
  }

  /**
   * Create an error response
   */
  error(
    message: string,
    errors?: string[],
    metadata?: Partial<ResponseMetadata>
  ): ErrorResponse {
    return {
      success: false,
      message,
      errors,
      metadata: {
        timestamp: new Date().toISOString(),
        path: '',
        method: '',
        ...metadata,
      },
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
      metadata: {
        timestamp: new Date().toISOString(),
        path: '',
        method: '',
        pagination,
        ...metadata,
      },
    };
  }

  /**
   * Create a simple success response with no data
   */
  ok(message?: string, metadata?: Partial<ResponseMetadata>): StandardApiResponse<void> {
    return {
      success: true,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        path: '',
        method: '',
        ...metadata,
      },
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
}
