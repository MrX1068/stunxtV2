import { useRootNavigationState, Redirect } from 'expo-router';
import { View } from 'react-native';
import { VStack, Box, Heading, Text, Button, ButtonText } from "@/components/ui";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/stores";
import { router } from 'expo-router';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Wait for navigation state to be ready
  if (!rootNavigationState?.key) return null;

  // If user is already authenticated, redirect to main app
  if (isAuthenticated && user) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Show loading while auth state is being determined
  if (isLoading) {
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
        </VStack>
      </View>
    );
  }

  // Show landing page for non-authenticated users
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

        {/* Action Buttons */}
        <VStack className="w-full max-w-sm gap-4 mt-8">
          <Button 
            className="w-full h-12" 
            onPress={() => router.push("/onboarding")}
          >
            <ButtonText className="text-white font-semibold">
              Get Started
            </ButtonText>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12"
            onPress={() => router.push("/auth/welcome")}
          >
            <ButtonText className="text-primary-600 font-semibold">
              I have an account
            </ButtonText>
          </Button>
        </VStack>

        {/* Version Info */}
        <Text size="sm" className="text-typography-400 absolute bottom-8">
          Version 1.0.0
        </Text>
      </VStack>
    </View>
  );
}
