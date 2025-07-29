import { View } from "react-native";
import { Link } from "expo-router";
import { VStack, Box, Heading, Text, Button, ButtonText } from "@/components/ui";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <VStack className="flex-1 justify-center items-center px-6 gap-8">
        {/* App Logo/Title */}
        <Box className="items-center gap-4">
          <Heading size="4xl" className="font-bold text-primary text-center">
            StunxtV2
          </Heading>
          <Text size="lg" className="text-typography-600 text-center max-w-sm">
            Connect, collaborate, and build amazing communities together
          </Text>
        </Box>

        {/* Action Buttons */}
        <VStack className="w-full max-w-sm gap-4">
          <Link href="/onboarding" asChild>
            <Button className="w-full h-12">
              <ButtonText className="text-white font-semibold">
                Get Started
              </ButtonText>
            </Button>
          </Link>
          
          <Link href="/auth/welcome" asChild>
            <Button variant="outline" className="w-full h-12">
              <ButtonText className="text-primary font-semibold">
                I have an account
              </ButtonText>
            </Button>
          </Link>
        </VStack>

        {/* Version Info */}
        <Text size="sm" className="text-typography-400 absolute bottom-8">
          Version 1.0.0
        </Text>
      </VStack>
    </View>
  );
}
