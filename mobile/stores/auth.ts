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
  bio?: string;
  location?: string;
  websiteUrl?: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  authProvider: 'local' | 'google' | 'facebook' | 'apple';
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
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
      console.warn('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.warn('SecureStore setItem error:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn('SecureStore removeItem error:', error);
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
                setError('Please verify your email before logging in');
                return;
              }
              
              setUser(user);
              setToken(tokens.accessToken);
              set({ 
                refreshToken: tokens.refreshToken,
                isAuthenticated: true 
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
                // User needs to verify email after registration
                setError('Please check your email to verify your account');
                return;
              }
              
              setUser(user);
              setToken(tokens.accessToken);
              set({ 
                refreshToken: tokens.refreshToken,
                isAuthenticated: true 
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
          const { setLoading, setError, setUser, setToken } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            // Call logout endpoint
            const apiStore = useApiStore.getState();
            await apiStore.post('/auth/logout');
            
          } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error);
          } finally {
            // Clear all auth state
            setUser(null);
            setToken(null);
            set({ 
              refreshToken: null,
              isAuthenticated: false,
              error: null 
            });
            setLoading(false);
          }
        },

        verifyEmail: async (email: string, otp: string) => {
          const { setLoading, setError, setUser, setToken } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<AuthResult>('/auth/verify-email', {
              email,
              otp
            });
            
            // If verification successful, store auth data
            if (response.user && response.tokens) {
              setUser(response.user);
              setToken(response.tokens.accessToken);
              set({ 
                refreshToken: response.tokens.refreshToken,
                isAuthenticated: true 
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
          const { refreshToken, setLoading, setError, setUser, setToken } = get();
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          try {
            setLoading(true);
            setError(null);
            
            const apiStore = useApiStore.getState();
            const response = await apiStore.post<BaseApiResponse<AuthResult>>('/auth/refresh', {
              refreshToken
            });
            
            if (response.success && response.data) {
              const { user, tokens } = response.data;
              
              setUser(user);
              setToken(tokens.accessToken);
              set({ 
                refreshToken: tokens.refreshToken,
                isAuthenticated: true 
              });
            } else {
              throw new Error(response.message || 'Token refresh failed');
            }
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            throw error;
          } finally {
            setLoading(false);
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
    changePassword: authStore.changePassword,
    clearError: authStore.clearError,
  };
};
