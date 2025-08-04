import React, { useEffect, ReactNode } from "react";
import { useAuth, useProfile } from "@/stores/auth";
import * as SecureStore from 'expo-secure-store';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { refreshAuth } = useAuth();
  const { refreshUserDataIfStale } = useProfile();

  useEffect(() => {
    // Check if we have stored tokens before attempting refresh
    const initAuth = async () => {
      try {
      
        
        // Only attempt refresh if we have stored tokens
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedRefreshToken = await SecureStore.getItemAsync('refresh_token');
        
        if (storedToken && storedRefreshToken) {
          
          await refreshAuth();
          
          // After successful auth refresh, check if user data is stale and refresh if needed
      
          await refreshUserDataIfStale();
        } else {
        }
      } catch (error) {
        // If refresh fails, user is not authenticated - this is fine
      }
    };

    initAuth();
  }, [refreshAuth, refreshUserDataIfStale]);

  return <>{children}</>;
}
