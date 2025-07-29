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
        <ThemeProvider>
          <GluestackUIProvider>
            <AuthProvider>
              <NotificationProvider>
                <StatusBar style="auto" />
                <RootNavigator />
              </NotificationProvider>
            </AuthProvider>
          </GluestackUIProvider>
        </ThemeProvider>
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
      
      {/* Community detail screen */}
      <Stack.Screen 
        name="community/[id]" 
        options={{
          title: "Community"
        }}
      />
      
      {/* Community and Space creation screens */}
      <Stack.Screen 
        name="create-community" 
        options={{
          presentation: "modal",
          title: "Create Community"
        }}
      />
      <Stack.Screen 
        name="create-space" 
        options={{
          presentation: "modal", 
          title: "Create Space"
        }}
      />
      
      {/* Settings screen */}
      <Stack.Screen name="settings" />
      
      {/* Modals and overlays - can be added when needed */}
    </Stack>
  );
}
