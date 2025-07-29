import { useState } from "react";
import { View, ScrollView, Dimensions } from "react-native";
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

const { width } = Dimensions.get('window');

const onboardingSteps = [
  {
    id: 1,
    emoji: "🚀",
    title: "Welcome to StunxtV2",
    description: "The next generation social platform for professionals and communities",
    color: "primary",
  },
  {
    id: 2,
    emoji: "👥",
    title: "Join Communities",
    description: "Connect with like-minded people and grow your professional network",
    color: "secondary",
  },
  {
    id: 3,
    emoji: "💬",
    title: "Real-time Messaging",
    description: "Stay connected with instant messaging and live conversations",
    color: "success",
  },
  {
    id: 4,
    emoji: "🌟",
    title: "Share & Discover",
    description: "Share your ideas, discover amazing content, and inspire others",
    color: "info",
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace("/auth/welcome");
    }
  };

  const skipOnboarding = () => {
    router.replace("/auth/welcome");
  };

  const currentData = onboardingSteps[currentStep];

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      
      {/* Skip Button */}
      <Box className="absolute top-12 right-6 z-10">
        <Button variant="outline" size="sm" onPress={skipOnboarding}>
          <ButtonText>Skip</ButtonText>
        </Button>
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="flex-1 justify-center px-6 gap-8">
          {/* Illustration */}
          <Box className="items-center gap-6">
            <Box className={`w-32 h-32 bg-${currentData.color} rounded-full items-center justify-center`}>
              <Text className="text-6xl">{currentData.emoji}</Text>
            </Box>
            
            <VStack className="gap-4 items-center">
              <Heading size="3xl" className="font-bold text-typography-900 text-center">
                {currentData.title}
              </Heading>
              <Text size="lg" className="text-typography-600 text-center max-w-sm leading-6">
                {currentData.description}
              </Text>
            </VStack>
          </Box>

          {/* Progress Indicators */}
          <HStack className="justify-center gap-2">
            {onboardingSteps.map((_, index) => (
              <Box
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentStep 
                    ? `bg-${currentData.color}` 
                    : 'bg-border-300'
                }`}
              />
            ))}
          </HStack>

          {/* Navigation */}
          <VStack className="gap-4">
            <Button
              size="lg"
              className={`w-full bg-${currentData.color}`}
              onPress={nextStep}
            >
              <ButtonText className="font-semibold">
                {currentStep === onboardingSteps.length - 1 ? "Get Started" : "Continue"}
              </ButtonText>
            </Button>

            {currentStep > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <ButtonText>Previous</ButtonText>
              </Button>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Step Counter */}
      <Box className="absolute bottom-6 left-6">
        <Text className="text-typography-500 text-sm">
          {currentStep + 1} of {onboardingSteps.length}
        </Text>
      </Box>
    </View>
  );
}
