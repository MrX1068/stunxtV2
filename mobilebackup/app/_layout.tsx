import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="system">
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <StatusBar style="auto" />
                <RootNavigator />
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Professional Navigation Structure with Authentication Support
function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Welcome/Onboarding screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      
      {/* Authentication group - this matches the auth folder structure */}
      <Stack.Screen name="auth" />
      
      {/* Main app screens (can be protected later) */}
      <Stack.Screen name="(tabs)" />
      
      {/* Modals and overlays - can be added when needed */}
    </Stack>
  );
}
