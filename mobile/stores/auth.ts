import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { useApiStore, ApiResponse as BaseApiResponse } from './api';

// Types for authentication
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  authProvider: 'local' | 'google' | 'facebook' | 'apple';
  emailVerified: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
    isPublic?: boolean;
    allowFollowers?: boolean;
  };
  preferences?: {
    theme: string;
    language: string;
    metadata?: {
      interests?: string[];
      onboardingCompleted?: boolean;
    };
  };
  stats?: {
    postCount: number;
    followerCount: number;
    followingCount: number;
    communityCount: number;
  };
  // Virtual properties from backend
  interests?: string[];
  isOnboardingComplete?: boolean;
  userStats?: {
    posts: number;
    followers: number;
    following: number;
    communities: number;
  };
  // Data freshness tracking
  lastFetched?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  username: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;
  avatarUrl?: string;
}

// Backend AuthResult interface
export interface AuthResult {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  sessionId: string;
  requiresEmailVerification?: boolean;
}

// Secure Storage adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (error) {
 
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
     
    }
  },
};

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Refresh lock to prevent infinite loops
  isRefreshing: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  
  // Email verification actions
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
  
  // Profile actions
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshUserDataIfStale: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Internal actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isRefreshing: false,
        
        // Actions
        login: async (credentials: LoginCredentials) => {
          const { setLoading, setError, setUser, setToken } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<BaseApiResponse<AuthResult>>('/auth/login', credentials);
            
            // Handle standardized backend response
            if (response.success && response.data) {
              const { user, tokens, requiresEmailVerification } = response.data;
              
              // Check if email verification is required
              if (requiresEmailVerification) {
                // Clear authentication state and set error
                set({
                  user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                  isAuthenticated: false,
                  isLoading: false,
                  error: 'Please verify your email before logging in'
                });
                return;
              }
              
              // Batch all state updates together
              set({
                user: {
                  ...user,
                  lastFetched: new Date().toISOString()
                },
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
            } else {
              throw new Error(response.message || 'Login failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        register: async (data: RegisterData) => {
          const { setLoading, setError, setUser, setToken } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            if (data.password !== data.confirmPassword) {
              throw new Error('Passwords do not match');
            }
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<BaseApiResponse<AuthResult>>('/auth/register', {
              email: data.email,
              password: data.password,
              confirmPassword: data.confirmPassword,
              fullName: data.fullName,
              username: data.username,
              bio: data.bio,
              location: data.location,
              websiteUrl: data.websiteUrl,
              avatarUrl: data.avatarUrl,
            });
            
            // Handle standardized backend response
            if (response.success && response.data) {
              const { user, tokens, requiresEmailVerification } = response.data;
              
              if (requiresEmailVerification) {
                // Store user and tokens even when email verification is required
                // This allows authenticated email verification
                set({
                  user,
                  token: tokens.accessToken,
                  refreshToken: tokens.refreshToken,
                  isAuthenticated: false, // Not fully authenticated until email verified
                  isLoading: false,
                  error: 'Please check your email to verify your account'
                });
                return;
              }
              
              // Full authentication for users who don't need email verification
              set({
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
            } else {
              throw new Error(response.message || 'Registration failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        logout: async () => {
          const state = get();
          const { setLoading, setError, token, user } = state;
          
          try {
            setLoading(true);
            setError(null);
            
            // Only call logout endpoint if we have a valid token
            if (token && user) {
              const apiStore = useApiStore.getState();
              // Make logout call using API store
              await apiStore.post('/auth/logout');
            }
            
          } catch (error) {
            // Continue with logout even if API call fails
           
          } finally {
            // Always clear auth state regardless of API call success/failure
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              error: null,
              isRefreshing: false,
              isLoading: false
            });
          }
        },

        verifyEmail: async (email: string, otp: string) => {
          const { setLoading, setError, setUser, setToken } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<BaseApiResponse<AuthResult>>('/auth/verify-email', {
              email,
              otp
            });
            
            // If verification successful, store auth data and mark as fully authenticated
            if (response.success && response.data) {
              // Batch all state updates together
              set({
                user: response.data.user,
                token: response.data.tokens.accessToken,
                refreshToken: response.data.tokens.refreshToken,
                isAuthenticated: true, // Now fully authenticated
                isLoading: false,
                error: null
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Email verification failed';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },

        resendEmailVerification: async (email: string) => {
          const { setLoading, setError } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<{ success: boolean; message: string }>('/auth/resend-verification', {
              email
            });
            
            if (!response.success) {
              throw new Error(response.message || 'Failed to resend verification code');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resend verification code';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        refreshAuth: async () => {
          const { refreshToken, setLoading, setError, setUser, setToken, isRefreshing } = get();
        
     

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          // Prevent multiple simultaneous refresh calls
          if (isRefreshing) {
            return;
          }
          
          try {
            // Batch state updates to prevent render-time updates
            set({ 
              isRefreshing: true,
              isLoading: true,
              error: null
            });
            
            const apiStore = useApiStore.getState();
      
            const response = await apiStore.post<BaseApiResponse<AuthResult>>('/auth/refresh', {
              refreshToken
            });
            
       
            
            if (response.success && response.data) {
              // The refresh response has tokens directly in data, not nested
              const tokens = response.data as any; // Cast since refresh has different structure
              
        
              
              // Batch all state updates together
              set({
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isAuthenticated: true,
                isLoading: false,
                isRefreshing: false
              });
            } else {
              
              throw new Error(response.message || 'Token refresh failed');
            }
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            throw error;
          } finally {
           
            // Ensure loading states are reset
            set({ 
              isLoading: false,
              isRefreshing: false 
            });
          }
        },
        
        updateProfile: async (data: Partial<User>) => {
          const { setLoading, setError, setUser, user } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.patch<BaseApiResponse<User>>('/auth/profile', data);
            
            if (response.success && response.data) {
              setUser(response.data);
            } else {
              throw new Error(response.message || 'Profile update failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Profile update failed';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        refreshUserData: async () => {
          const { setLoading, setError, setUser, user } = get();
          
          if (!user) {
            return; // No user to refresh
          }
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.get<BaseApiResponse<User>>('/users/me');
            
            if (response.success && response.data) {
              // Add timestamp when we fetched the data
              const userWithTimestamp = {
                ...response.data,
                lastFetched: new Date().toISOString()
              };
              setUser(userWithTimestamp);
            } else {
              throw new Error(response.message || 'Failed to refresh user data');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh user data';
            setError(message);
            // Don't throw error for refresh - it's a background operation
          } finally {
            setLoading(false);
          }
        },
        
        refreshUserDataIfStale: async () => {
          const { user, refreshUserData } = get();
          
          if (!user) {
            return; // No user to check
          }
          
          // Check if data is stale (older than 5 minutes)
          const STALENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
          const now = new Date().getTime();
          const lastFetched = user.lastFetched ? new Date(user.lastFetched).getTime() : 0;
          const isStale = now - lastFetched > STALENESS_THRESHOLD;
          
          // Only refresh if data is stale or if we've never fetched it
          if (isStale || !user.lastFetched) {
            await refreshUserData();
          }
        },
        
        changePassword: async (currentPassword: string, newPassword: string) => {
          const { setLoading, setError } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<BaseApiResponse>('/auth/change-password', {
              currentPassword,
              newPassword
            });
            
            if (!response.success) {
              throw new Error(response.message || 'Password change failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Password change failed';
            setError(message);
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        clearError: () => set({ error: null }),
        
        // Internal actions
        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => secureStorage),
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Make auth store globally available for API integration
if (typeof window !== 'undefined') {
  (window as any).__AUTH_STORE__ = useAuthStore;
}

// Global Auth Store State Logger (like Redux DevTools)
if (__DEV__) {
  useAuthStore.subscribe((state) => {
    console.log('🔐 AUTH STORE STATE CHANGE:', state, {
      timestamp: new Date().toISOString(),
      user: state.user ? {
        id: state.user.id,
        email: state.user.email,
        username: state.user.username,
        fullName: state.user.fullName,
        emailVerified: state.user.emailVerified,
        status: state.user.status,
        role: state.user.role,
        authProvider: state.user.authProvider,
        lastLoginAt: state.user.lastLoginAt,
        createdAt: state.user.createdAt
      } : null,
      tokens: {
        accessToken: state.token || null,
        refreshToken: state.refreshToken || null,
        hasAccessToken: !!state.token,
        hasRefreshToken: !!state.refreshToken,
        accessTokenLength: state.token?.length || 0,
        refreshTokenLength: state.refreshToken?.length || 0
      },
      flags: {
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        isRefreshing: state.isRefreshing,
        hasError: !!state.error,
        error: state.error
      }
    });
  });
}

// Auth hooks for common operations
export const useAuth = () => {
  const authStore = useAuthStore();
  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    refreshAuth: authStore.refreshAuth,
    verifyEmail: authStore.verifyEmail,
    resendEmailVerification: authStore.resendEmailVerification,
    clearError: authStore.clearError,
  };
};

export const useProfile = () => {
  const authStore = useAuthStore();
  return {
    user: authStore.user,
    isLoading: authStore.isLoading,
    error: authStore.error,
    updateProfile: authStore.updateProfile,
    refreshUserData: authStore.refreshUserData,
    refreshUserDataIfStale: authStore.refreshUserDataIfStale,
    changePassword: authStore.changePassword,
    clearError: authStore.clearError,
  };
};
