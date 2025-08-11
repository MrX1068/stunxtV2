export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ResponseMetadata {
  timestamp: string;
  path: string;
  method: string;
  pagination?: PaginationMetadata;
  requestId?: string;
  correlationId: string;
  duration?: number;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  metadata: ResponseMetadata;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  metadata: ResponseMetadata;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  metadata: ResponseMetadata;
}

// Utility type for paginated responses
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export type PaginatedResponse<T> = SuccessResponse<PaginatedData<T>>;
