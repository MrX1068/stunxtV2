# 🔌 API Integration Guide

Complete guide for integrating with the StunxtV2 backend API from the mobile application.

## 🚀 Overview

The StunxtV2 mobile app connects to a NestJS backend with microservices architecture. This guide covers API integration patterns, authentication, real-time features, and best practices.

### **Backend Architecture**

```
┌─────────────────────────────────────────────┐
│              API Gateway                    │
│           (Port 3000)                       │
├─────────────────────────────────────────────┤
│                Services                     │
├─────────────────┬───────────────────────────┤
│ User Management │ Community Management      │
│    (Port 3001)  │     (Port 3002)          │
├─────────────────┼───────────────────────────┤
│    Messaging    │       Events             │
│   (Port 3003)   │    (Port 3004)           │
├─────────────────┼───────────────────────────┤
│   Notifications │     File Upload          │
│   (Port 3005)   │    (Port 3006)           │
└─────────────────┴───────────────────────────┘
```

## ⚙️ API Configuration

### **Environment Setup**

```typescript
// .env.development
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
EXPO_PUBLIC_ENVIRONMENT=development

// .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.stunxtv2.com/api
EXPO_PUBLIC_WS_URL=wss://staging-ws.stunxtv2.com
EXPO_PUBLIC_ENVIRONMENT=staging

// .env.production
EXPO_PUBLIC_API_URL=https://api.stunxtv2.com/api
EXPO_PUBLIC_WS_URL=wss://ws.stunxtv2.com
EXPO_PUBLIC_ENVIRONMENT=production
```

### **API Client Setup**

```typescript
// services/api.ts
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return response.text() as unknown as T;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response body is not JSON, use status text
    }

    // Handle specific error codes
    switch (response.status) {
      case 401:
        await this.handleUnauthorized();
        throw new ApiError('Unauthorized - please log in again', 401);
      case 403:
        throw new ApiError('Access forbidden', 403);
      case 404:
        throw new ApiError('Resource not found', 404);
      case 422:
        throw new ApiError(errorMessage, 422);
      case 500:
        throw new ApiError('Server error - please try again later', 500);
      default:
        throw new ApiError(errorMessage, response.status);
    }
  }

  /**
   * Handle unauthorized responses
   */
  private async handleUnauthorized() {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    
    if (refreshToken) {
      try {
        const response = await this.refreshToken(refreshToken);
        await SecureStore.setItemAsync('accessToken', response.accessToken);
        return;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    // If refresh fails or no refresh token, logout user
    await this.logout();
  }

  /**
   * Get stored authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('accessToken');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  // HTTP method helpers
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
```

## 🔐 Authentication Integration

### **Authentication Service**

```typescript
// services/auth.ts
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  username: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    
    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    
    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return await api.post('/auth/refresh', { refreshToken });
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local tokens
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return await api.get<User>('/auth/me');
  }

  /**
   * Send OTP for verification
   */
  async sendOTP(email: string): Promise<{ message: string }> {
    return await api.post('/auth/send-otp', { email });
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, code: string): Promise<{ verified: boolean }> {
    return await api.post('/auth/verify-otp', { email, code });
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ message: string }> {
    return await api.post('/auth/reset-password', { email });
  }
}

export const authService = new AuthService();
```

### **Authentication Store Integration**

```typescript
// stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authService.register(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      loadUser: async () => {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token is invalid, clear authentication
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          await authService.logout();
        }
      },

      updateProfile: async (data) => {
        const user = get().user;
        if (!user) return;

        const updatedUser = await api.patch<User>(`/users/${user.id}`, data);
        set({ user: updatedUser });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

## 🏘️ Community API Integration

### **Community Service**

```typescript
// services/community.ts
interface CreateCommunityData {
  name: string;
  description: string;
  type: 'public' | 'private';
  category: string;
  image?: string;
}

interface UpdateCommunityData {
  name?: string;
  description?: string;
  image?: string;
}

class CommunityService {
  /**
   * Get all communities with pagination
   */
  async getCommunities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<PaginatedResponse<Community>> {
    return await api.get('/communities', params);
  }

  /**
   * Get single community by ID
   */
  async getCommunity(id: string): Promise<Community> {
    return await api.get(`/communities/${id}`);
  }

  /**
   * Create new community
   */
  async createCommunity(data: CreateCommunityData): Promise<Community> {
    return await api.post('/communities', data);
  }

  /**
   * Update community
   */
  async updateCommunity(id: string, data: UpdateCommunityData): Promise<Community> {
    return await api.patch(`/communities/${id}`, data);
  }

  /**
   * Delete community
   */
  async deleteCommunity(id: string): Promise<void> {
    await api.delete(`/communities/${id}`);
  }

  /**
   * Join community
   */
  async joinCommunity(id: string): Promise<{ message: string }> {
    return await api.post(`/communities/${id}/join`);
  }

  /**
   * Leave community
   */
  async leaveCommunity(id: string): Promise<{ message: string }> {
    return await api.post(`/communities/${id}/leave`);
  }

  /**
   * Get community members
   */
  async getCommunityMembers(
    id: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<CommunityMember>> {
    return await api.get(`/communities/${id}/members`, params);
  }

  /**
   * Get user's communities
   */
  async getUserCommunities(): Promise<Community[]> {
    return await api.get('/communities/my');
  }

  /**
   * Search communities
   */
  async searchCommunities(query: string): Promise<Community[]> {
    return await api.get('/communities/search', { q: query });
  }
}

export const communityService = new CommunityService();
```

### **Community Hooks with TanStack Query**

```typescript
// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { communityService } from '@/services/community';

/**
 * Hook to fetch paginated communities
 */
export function useCommunities(filters?: {
  search?: string;
  category?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['communities', filters],
    queryFn: async ({ pageParam = 1 }) => {
      return await communityService.getCommunities({
        page: pageParam,
        limit: 20,
        ...filters,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch single community
 */
export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['community', id],
    queryFn: () => communityService.getCommunity(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to create community
 */
export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createCommunity,
    onSuccess: (newCommunity) => {
      // Add to communities list
      queryClient.setQueryData(['communities'], (old: any) => {
        if (!old) return { pages: [{ data: [newCommunity], hasMore: false }] };
        
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, data: [newCommunity, ...firstPage.data] },
            ...old.pages.slice(1),
          ],
        };
      });

      // Invalidate user communities
      queryClient.invalidateQueries({ queryKey: ['communities', 'my'] });
    },
  });
}

/**
 * Hook to join/leave community
 */
export function useCommunityMembership() {
  const queryClient = useQueryClient();

  const joinMutation = useMutation({
    mutationFn: communityService.joinCommunity,
    onSuccess: (_, communityId) => {
      // Update community data
      queryClient.setQueryData(['community', communityId], (old: Community) => ({
        ...old,
        memberCount: old.memberCount + 1,
        isJoined: true,
      }));

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['communities', 'my'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: communityService.leaveCommunity,
    onSuccess: (_, communityId) => {
      // Update community data
      queryClient.setQueryData(['community', communityId], (old: Community) => ({
        ...old,
        memberCount: old.memberCount - 1,
        isJoined: false,
      }));

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['communities', 'my'] });
    },
  });

  return {
    joinCommunity: joinMutation.mutate,
    leaveCommunity: leaveMutation.mutate,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
  };
}

/**
 * Hook to search communities
 */
export function useSearchCommunities(query: string) {
  return useQuery({
    queryKey: ['communities', 'search', query],
    queryFn: () => communityService.searchCommunities(query),
    enabled: query.length > 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

## 💬 Messaging & Real-Time Features

### **WebSocket Service**

```typescript
// services/socket.ts
import { io, Socket } from 'socket.io-client';

interface MessageData {
  id: string;
  content: string;
  author: User;
  communityId: string;
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to WebSocket server
   */
  connect(userId: string) {
    if (this.socket?.connected) return;

    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(wsUrl, {
      auth: { userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('🔴 WebSocket error:', error);
    });

    // Real-time message handling
    this.socket.on('new-message', (message: MessageData) => {
      this.emit('new-message', message);
    });

    // Typing indicators
    this.socket.on('user-typing', (data: { userId: string; communityId: string }) => {
      this.emit('user-typing', data);
    });

    this.socket.on('user-stopped-typing', (data: { userId: string; communityId: string }) => {
      this.emit('user-stopped-typing', data);
    });

    // Community updates
    this.socket.on('community-updated', (community: Community) => {
      this.emit('community-updated', community);
    });
  }

  /**
   * Join a community room
   */
  joinCommunity(communityId: string) {
    this.socket?.emit('join-community', communityId);
  }

  /**
   * Leave a community room
   */
  leaveCommunity(communityId: string) {
    this.socket?.emit('leave-community', communityId);
  }

  /**
   * Send a message
   */
  sendMessage(communityId: string, content: string) {
    this.socket?.emit('send-message', {
      communityId,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send typing indicator
   */
  startTyping(communityId: string) {
    this.socket?.emit('start-typing', { communityId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(communityId: string) {
    this.socket?.emit('stop-typing', { communityId });
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit events to subscribers
   */
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }
}

export const socketService = new SocketService();
```

### **Real-Time Hooks**

```typescript
// hooks/useRealTimeMessages.ts
export function useRealTimeMessages(communityId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !communityId) return;

    // Connect and join community
    socketService.connect(user.id);
    socketService.joinCommunity(communityId);

    // Handle new messages
    const handleNewMessage = (message: MessageData) => {
      queryClient.setQueryData(
        ['messages', communityId],
        (old: PaginatedResponse<Message>) => {
          if (!old) return { data: [message], hasMore: false, page: 1 };
          
          return {
            ...old,
            data: [...old.data, message],
          };
        }
      );

      // Show notification if app is in background
      if (AppState.currentState !== 'active') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: message.author.name,
            body: message.content,
            data: { communityId, messageId: message.id },
          },
          trigger: null,
        });
      }
    };

    // Handle typing indicators
    const handleUserTyping = (data: { userId: string; communityId: string }) => {
      // Update typing state
    };

    // Subscribe to events
    socketService.on('new-message', handleNewMessage);
    socketService.on('user-typing', handleUserTyping);

    // Cleanup
    return () => {
      socketService.leaveCommunity(communityId);
      socketService.off('new-message', handleNewMessage);
      socketService.off('user-typing', handleUserTyping);
    };
  }, [communityId, user?.id, queryClient]);

  return {
    sendMessage: (content: string) => socketService.sendMessage(communityId, content),
    startTyping: () => socketService.startTyping(communityId),
    stopTyping: () => socketService.stopTyping(communityId),
  };
}
```

## 📁 File Upload Integration

### **Upload Service**

```typescript
// services/upload.ts
interface UploadResponse {
  url: string;
  key: string;
  size: number;
  type: string;
}

class UploadService {
  /**
   * Upload image file
   */
  async uploadImage(uri: string, type: 'avatar' | 'community' | 'post'): Promise<UploadResponse> {
    const formData = new FormData();
    
    // Prepare file data
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type: fileType,
    } as any);
    
    formData.append('type', type);

    // Upload with progress tracking
    return await api.request<UploadResponse>('/upload/image', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Upload multiple images
   */
  async uploadImages(uris: string[], type: string): Promise<UploadResponse[]> {
    const uploadPromises = uris.map(uri => this.uploadImage(uri, type as any));
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(key: string): Promise<void> {
    await api.delete(`/upload/${key}`);
  }
}

export const uploadService = new UploadService();
```

### **Image Upload Hook**

```typescript
// hooks/useImageUpload.ts
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (
    uri: string,
    type: 'avatar' | 'community' | 'post'
  ): Promise<UploadResponse> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Simulate progress (real progress tracking would require XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadService.uploadImage(uri, type);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const pickAndUploadImage = async (type: 'avatar' | 'community' | 'post') => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera roll is required');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      return await uploadImage(result.assets[0].uri, type);
    }

    return null;
  };

  return {
    uploadImage,
    pickAndUploadImage,
    isUploading,
    progress,
  };
}
```

## 📊 API Error Handling

### **Global Error Handler**

```typescript
// utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: any): AppError {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return new AppError('Invalid request. Please check your input.', 'INVALID_REQUEST', 400);
      case 401:
        return new AppError('Please log in to continue.', 'UNAUTHORIZED', 401);
      case 403:
        return new AppError('Access denied.', 'FORBIDDEN', 403);
      case 404:
        return new AppError('The requested resource was not found.', 'NOT_FOUND', 404);
      case 422:
        return new AppError(error.message, 'VALIDATION_ERROR', 422);
      case 500:
        return new AppError('Server error. Please try again later.', 'SERVER_ERROR', 500);
      default:
        return new AppError(error.message, 'API_ERROR', error.status);
    }
  }

  if (error.name === 'NetworkError' || !navigator.onLine) {
    return new AppError('Please check your internet connection.', 'NETWORK_ERROR');
  }

  return new AppError('An unexpected error occurred.', 'UNKNOWN_ERROR');
}
```

### **Error Boundary for API Calls**

```typescript
// components/ApiErrorBoundary.tsx
interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: AppError, retry: () => void) => React.ReactNode;
}

export function ApiErrorBoundary({ children, fallback }: ApiErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => {
        const appError = handleApiError(error);
        
        if (fallback) {
          return fallback(appError, resetErrorBoundary);
        }

        return (
          <VStack className="flex-1 justify-center items-center p-6">
            <Text className="text-lg font-semibold text-center mb-2">
              {appError.message}
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              Code: {appError.code}
            </Text>
            <Button onPress={resetErrorBoundary}>
              <ButtonText>Try Again</ButtonText>
            </Button>
          </VStack>
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 🔄 Offline Support

### **Offline-First Patterns**

```typescript
// hooks/useOfflineSync.ts
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      
      if (state.isConnected) {
        // Sync when coming back online
        queryClient.refetchQueries({
          predicate: (query) => query.state.status === 'error',
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return { isOnline };
}

// Optimistic updates for better UX
export function useOptimisticUpdates() {
  const queryClient = useQueryClient();

  const optimisticUpdate = <T>(
    queryKey: any[],
    updateFn: (old: T) => T,
    rollbackFn?: (old: T) => T
  ) => {
    // Store previous data for rollback
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    // Optimistically update
    queryClient.setQueryData(queryKey, updateFn);

    return {
      rollback: () => {
        if (previousData && rollbackFn) {
          queryClient.setQueryData(queryKey, rollbackFn(previousData));
        }
      },
    };
  };

  return { optimisticUpdate };
}
```

## 📱 Platform-Specific API Considerations

### **iOS Specific**

```typescript
// Handle iOS background app refresh
useEffect(() => {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App became active, refetch critical data
      queryClient.refetchQueries({
        predicate: (query) => query.queryKey[0] === 'communities',
      });
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription?.remove();
}, []);
```

### **Android Specific**

```typescript
// Handle Android network security config
if (Platform.OS === 'android' && __DEV__) {
  // Allow HTTP traffic in development
  console.warn('HTTP traffic allowed in development mode');
}
```

---

## 🎯 Best Practices Summary

1. **✅ Always handle errors gracefully**
2. **✅ Use TypeScript for API contracts**
3. **✅ Implement proper loading states**
4. **✅ Cache data appropriately with TanStack Query**
5. **✅ Handle offline scenarios**
6. **✅ Use optimistic updates for better UX**
7. **✅ Implement proper authentication flows**
8. **✅ Test API integration thoroughly**
9. **✅ Monitor API performance**
10. **✅ Document API changes**

This comprehensive API integration ensures the StunxtV2 mobile app provides a robust, reliable, and user-friendly experience across all platforms and network conditions.