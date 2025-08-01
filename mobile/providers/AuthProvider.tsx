import React, { useEffect, ReactNode } from "react";
import { useAuth } from "@/stores/auth";
import * as SecureStore from 'expo-secure-store';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { refreshAuth } = useAuth();

  useEffect(() => {
    // Check if we have stored tokens before attempting refresh
    const initAuth = async () => {
      try {
        console.log('AuthProvider - Checking initial auth state...');
        
        // Only attempt refresh if we have stored tokens
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedRefreshToken = await SecureStore.getItemAsync('refresh_token');
        
        if (storedToken && storedRefreshToken) {
          console.log('AuthProvider - Found stored tokens, attempting refresh...');
          await refreshAuth();
        } else {
          console.log('AuthProvider - No stored tokens found, skipping refresh');
        }
      } catch (error) {
        // If refresh fails, user is not authenticated - this is fine
        console.log("Auth refresh failed:", error);
      }
    };

    initAuth();
  }, []);

  return <>{children}</>;
}
