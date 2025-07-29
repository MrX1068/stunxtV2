import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { VStack, Box, Heading, Text, Button, ButtonText } from "@/components/ui";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/stores";

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      // Wait a moment for auth state to be determined
      if (!isLoading) {
        if (isAuthenticated && user) {
          // User is logged in, go to main app
          router.replace("/(tabs)/communities");
        } else {
          // New user, show onboarding after a brief delay
          // setTimeout(() => {
          //   router.replace("/onboarding");
          // }, 2000);
        }
      }
    };

    checkAuthAndNavigate();
  }, [isAuthenticated, user, isLoading]);

  // Show loading/splash screen
  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style="dark" />
      <VStack className="flex-1 justify-center items-center px-6 gap-8">
        {/* App Logo/Title */}
        <VStack className="items-center gap-6">
          <Box className="w-32 h-32 bg-primary-500 rounded-3xl items-center justify-center shadow-lg">
            <Text className="text-6xl">🚀</Text>
          </Box>
          
          <VStack className="gap-2 items-center">
            <Heading size="4xl" className="font-bold text-typography-900 text-center">
              StunxtV2
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Create and discover amazing communities
            </Text>
          </VStack>
        </VStack>

        {/* Loading indicator */}
        <Box className="items-center mt-8">
          <Box className="w-8 h-8 bg-primary-500 rounded-full animate-pulse" />
          <Text className="text-typography-500 mt-2">Loading...</Text>
        </Box>

        {/* Manual navigation buttons (for development/fallback) */}
        {!isLoading && (
          <VStack className="w-full max-w-sm gap-4 mt-8">
            <Button 
              className="w-full h-12" 
              onPress={() => router.replace("/onboarding")}
            >
              <ButtonText className="text-white font-semibold">
                Get Started
              </ButtonText>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12"
              onPress={() => router.replace("/auth/welcome")}
            >
              <ButtonText className="text-primary-600 font-semibold">
                I have an account
              </ButtonText>
            </Button>
          </VStack>
        )}

        {/* Version Info */}
        <Text size="sm" className="text-typography-400 absolute bottom-8">
          Version 1.0.0
        </Text>
      </VStack>
    </View>
  );
}
