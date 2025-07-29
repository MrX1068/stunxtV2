import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Base API configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.31.7:3000/api/v1' 
  : 'https://your-production-api.com/api/v1';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base API client interface
interface ApiState {
  // Loading states
  isLoading: boolean;
  
  // Error handling
  error: string | null;
  
  // Request tracking
  requestCount: number;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  incrementRequest: () => void;
  decrementRequest: () => void;
  
  // Generic API methods
  get: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  delete: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
  
  // Internal method
  makeRequest: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export const useApiStore = create<ApiState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      requestCount: 0,
      
      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      incrementRequest: () => set((state) => ({ 
        requestCount: state.requestCount + 1,
        isLoading: true 
      })),
      decrementRequest: () => set((state) => {
        const newCount = Math.max(0, state.requestCount - 1);
        return { 
          requestCount: newCount,
          isLoading: newCount > 0 
        };
      }),
      
      // Generic API methods
      get: async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
        return get().makeRequest<T>(endpoint, { 
          method: 'GET', 
          ...options 
        });
      },
      
      post: async <T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> => {
        return get().makeRequest<T>(endpoint, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
          ...options
        });
      },
      
      put: async <T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> => {
        return get().makeRequest<T>(endpoint, {
          method: 'PUT',
          body: data ? JSON.stringify(data) : undefined,
          ...options
        });
      },
      
      patch: async <T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> => {
        return get().makeRequest<T>(endpoint, {
          method: 'PATCH',
          body: data ? JSON.stringify(data) : undefined,
          ...options
        });
      },
      
      delete: async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
        return get().makeRequest<T>(endpoint, {
          method: 'DELETE',
          ...options
        });
      },
      
      // Private method for making requests
      makeRequest: async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
        const { incrementRequest, decrementRequest, setError } = get();
        
        try {
          incrementRequest();
          setError(null);
          
          // Import auth store dynamically to avoid circular dependency
          const { useAuthStore } = await import('./auth');
          const token = useAuthStore.getState().token;
          
          const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
          
          const defaultHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          };
          
          if (token) {
            defaultHeaders.Authorization = `Bearer ${token}`;
          }
          
          const response = await fetch(url, {
            ...options,
            headers: {
              ...defaultHeaders,
              ...options.headers,
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              // Use the raw text if it's not JSON
              errorMessage = errorText || errorMessage;
            }
            
            throw new ApiError(errorMessage, response.status, response);
          }
          
          const data = await response.json();
          return data as T;
          
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error occurred';
          setError(message);
          throw error;
        } finally {
          decrementRequest();
        }
      },
    }),
    {
      name: 'api-store',
    }
  )
);
