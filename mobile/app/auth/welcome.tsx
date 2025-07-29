import { View } from "react-native";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { VStack, Box, Heading, Text, Button, ButtonText } from "@/components/ui";

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      
      <VStack className="flex-1 justify-center px-6 gap-8">
        {/* App Logo/Title */}
        <Box className="items-center gap-6">
          <Box className="w-24 h-24 bg-primary-500 rounded-full items-center justify-center">
            <Text className="text-4xl font-bold text-white">S</Text>
          </Box>
          
          <VStack className="items-center gap-4">
            <Heading size="4xl" className="font-bold text-primary text-center">
              StunxtV2
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Connect, collaborate, and build amazing communities together
            </Text>
          </VStack>
        </Box>

        {/* Authentication Options */}
        <VStack className="w-full gap-4">
          <Link href="/auth/login" asChild>
            <Button size="lg" className="w-full">
              <ButtonText className="text-white font-semibold">
                Sign In
              </ButtonText>
            </Button>
          </Link>
          
          <Link href="/auth/register" asChild>
            <Button variant="outline" size="lg" className="w-full">
              <ButtonText className="text-primary font-semibold">
                Create Account
              </ButtonText>
            </Button>
          </Link>
          
          <Button variant="link" size="lg" className="w-full" onPress={() => router.replace("/home")}>
            <ButtonText className="text-typography-600">
              Continue as Guest
            </ButtonText>
          </Button>
        </VStack>

        {/* Terms and Privacy */}
        <VStack className="items-center gap-2">
          <Text className="text-typography-500 text-center text-sm">
            By continuing, you agree to our
          </Text>
          <Text className="text-primary text-sm">
            Terms of Service & Privacy Policy
          </Text>
        </VStack>
      </VStack>

      {/* Version Info */}
      <Box className="items-center pb-8">
        <Text className="text-typography-400 text-sm">
          Version 1.0.0
        </Text>
      </Box>
    </View>
  );
}
