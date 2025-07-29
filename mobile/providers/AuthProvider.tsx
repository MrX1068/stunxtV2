import React, { useEffect, ReactNode } from "react";
import { router } from "expo-router";
import { useAuth } from "@/stores/auth";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, user, refreshAuth } = useAuth();

  useEffect(() => {
    // Try to refresh auth status on app start
    const initAuth = async () => {
      try {
        await refreshAuth();
      } catch (error) {
        // If refresh fails, user is not authenticated - this is fine
        console.log("Auth refresh failed:", error);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    // Handle navigation based on auth state
    if (!isLoading) {
      if (isAuthenticated && user) {
        // User is authenticated, check if they're on auth screens
        const currentPath = router.pathname || '/';
        if (currentPath.startsWith('/auth') || currentPath === '/onboarding' || currentPath === '/') {
          // Redirect to main app
          router.replace('/(tabs)/home');
        }
      } else {
        // User is not authenticated, check if they're on protected screens
        const currentPath = router.pathname || '/';
        if (currentPath.startsWith('/(tabs)') || currentPath.startsWith('/create') || currentPath.startsWith('/settings')) {
          // Redirect to welcome/auth
        //   router.replace('/');
        }
      }
    }
  }, [isAuthenticated, isLoading, user]);

  return <>{children}</>;
}
