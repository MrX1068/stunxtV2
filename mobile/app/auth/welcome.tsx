import { useState } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from "@/components/ui";
import { MaterialIcons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    router.push("/auth/login");
  };

  const handleSignUp = () => {
    router.push("/auth/register");
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      // For guest mode, we'll skip auth and go directly to communities
      // Guest users can browse but cannot create/join communities
      router.replace("/(tabs)/communities");
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style="dark" />
      
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="flex-1 justify-center px-8 gap-12">
          {/* Logo/Brand Section */}
          <VStack className="items-center gap-6">
            <Box className="w-32 h-32 bg-primary-500 rounded-3xl items-center justify-center shadow-lg">
              <MaterialIcons name="forum" size={60} color="#FFFFFF" />
            </Box>
            
            <VStack className="gap-3 items-center">
              <Heading size="4xl" className="font-bold text-typography-900 text-center">
                StunxtV2
              </Heading>
              <Text size="xl" className="text-typography-600 text-center max-w-sm leading-relaxed">
                Create and discover amazing communities. Connect with people who share your interests.
              </Text>
            </VStack>
          </VStack>

          {/* Action Buttons */}
          <VStack className="gap-4">
            <Button
              size="lg"
              className="w-full bg-primary-600"
              onPress={handleSignUp}
            >
              <ButtonText className="font-semibold text-white text-lg">
                Create Account
              </ButtonText>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full border-primary-300"
              onPress={handleSignIn}
            >
              <ButtonText className="font-semibold text-primary-600 text-lg">
                Sign In
              </ButtonText>
            </Button>

            <Box className="items-center mt-4">
              <Button
                variant="link"
                onPress={handleGuestMode}
                disabled={loading}
              >
                <ButtonText className="text-typography-500 text-base">
                  {loading ? "Loading..." : "Continue as Guest"}
                </ButtonText>
              </Button>
            </Box>
          </VStack>

          {/* Features Preview */}
          <VStack className="gap-4 mt-8">
            <Text size="lg" className="font-semibold text-typography-700 text-center">
              What you can do:
            </Text>
            
            <VStack className="gap-3">
              <HStack className="items-center gap-3">
                <Box className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                  <MaterialIcons name="group-add" size={16} color="#059669" />
                </Box>
                <Text className="text-typography-600 flex-1">
                  Create your own communities
                </Text>
              </HStack>
              
              <HStack className="items-center gap-3">
                <Box className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                  <MaterialIcons name="forum" size={16} color="#2563EB" />
                </Box>
                <Text className="text-typography-600 flex-1">
                  Join discussions in spaces
                </Text>
              </HStack>
              
              <HStack className="items-center gap-3">
                <Box className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center">
                  <MaterialIcons name="connect-without-contact" size={16} color="#7C3AED" />
                </Box>
                <Text className="text-typography-600 flex-1">
                  Connect with like-minded people
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
       
}
