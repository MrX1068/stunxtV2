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
  
  // Token refresh tracking
  isRefreshingToken: boolean;
  
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
      isRefreshingToken: false,
      
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
          body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
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
      
      patch: async <T = any>(endpoint: string, data?: any, options?: RequestInit) => {
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
        const { incrementRequest, decrementRequest, setError, isRefreshingToken } = get();
        
        try {
          incrementRequest();
          setError(null);
          
          // Import auth store dynamically to avoid circular dependency
          const { useAuthStore } = await import('./auth');
          const authState = useAuthStore.getState();
          const token = authState.token;
          
          const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
          
          const defaultHeaders: HeadersInit = {
            'Accept': 'application/json',
          };
          
          // Only set Content-Type for non-FormData requests
          if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
          }
          
          if (token) {
            defaultHeaders.Authorization = `Bearer ${token}`;
          }
          // Debug log removed: url
          const response = await fetch(url, {
            ...options,
            headers: {
              ...defaultHeaders,
              ...options.headers,
            },
          });
          // Removed debug log for response to clean up production code
          // Handle token expiry with automatic refresh
          // For logout endpoint: try refresh once to enable proper server-side cleanup
          // For other endpoints: normal refresh behavior
          if (response.status === 401 && token && !isRefreshingToken && endpoint !== '/auth/refresh') {
            try {
              set({ isRefreshingToken: true });
              
              // Try to refresh the token
              await authState.refreshAuth();
              
              // Retry the original request with new token
              const newToken = useAuthStore.getState().token;
              if (newToken) {
                const retryHeaders = {
                  ...defaultHeaders,
                  Authorization: `Bearer ${newToken}`,
                  ...options.headers,
                };
                
                const retryResponse = await fetch(url, {
                  ...options,
                  headers: retryHeaders,
                });
                
                if (retryResponse.ok) {
                  const data = await retryResponse.json();
                  return data as T;
                }
                
                // For logout endpoint: if retry fails, it's ok - we'll continue with local logout
                if (endpoint === '/auth/logout' && !retryResponse.ok) {
                  console.log('Logout API call failed after token refresh, continuing with local logout');
                  return {} as T; // Return empty success for logout
                }
              }
            } catch (refreshError) {
              // If refresh fails, the auth store will handle logout
              console.log('Token refresh failed:', refreshError);
              
              // For logout endpoint: if refresh fails, it's ok - continue with local logout
              if (endpoint === '/auth/logout') {
                console.log('Token refresh failed during logout, continuing with local logout');
                return {} as T; // Return empty success for logout
              }
            } finally {
              set({ isRefreshingToken: false });
            }
          }
          
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
          
          // Handle 204 No Content responses
          if (response.status === 204) {
            return {} as T;
          }
          
          const data = await response.json();
          return data as T;
          
        } catch (error) {
          console.log("error ", error)
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
