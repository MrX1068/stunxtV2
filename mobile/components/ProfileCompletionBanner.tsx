import React, { useState } from 'react';
import { Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { useOnboardingStatus, useOnboardingStepInfo } from '@/utils/useOnboardingStatus';

interface ProfileCompletionBannerProps {
  style?: any;
  className?: string;
  variant?: 'profile' | 'home' | 'compact'; // Different display variants
}

/**
 * Smart banner that shows profile completion status
 * Automatically shows/hides based on completion status and context
 */
export function ProfileCompletionBanner({ 
  style,
  className,
  variant = 'profile'
}: ProfileCompletionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { isComplete, nextStep, completionPercentage, missingSteps } = useOnboardingStatus();
  const stepInfo = useOnboardingStepInfo(nextStep || '');

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  // For profile page: show brief celebration when complete, then hide
  // For other pages: only show when incomplete
  const shouldShowWhenComplete = variant === 'profile';
  
  // Don't show if complete and not on profile page
  if (isComplete && !shouldShowWhenComplete) {
    return null;
  }

  // Show completion celebration on profile page
  if (isComplete && shouldShowWhenComplete) {
    return (
      <Box 
        className={`bg-success-50 border border-success-200 rounded-xl p-4 mx-4 my-2 ${className}`}
        style={style}
      >
        <HStack className="items-center justify-between">
          <HStack className="items-center gap-3 flex-1">
            <Text className="text-2xl">🎉</Text>
            <VStack className="flex-1">
              <Text className="font-semibold text-success-800">
                Profile Complete!
              </Text>
              <Text className="text-sm text-success-600">
                Your profile is all set up and ready to go
              </Text>
            </VStack>
          </HStack>
          
          <Pressable 
            onPress={() => setDismissed(true)}
            className="ml-2 p-1"
          >
            <Text className="text-success-400">✕</Text>
          </Pressable>
        </HStack>
      </Box>
    );
  }

  // Show progress banner
  const handleCompleteStep = () => {
    if (!nextStep) return;

    switch (nextStep) {
      case 'profile-setup':
        router.push('/auth/profile-setup');
        break;
      case 'avatar-upload':
        router.push('/auth/profile-setup');
        break;
      case 'interests-selection':
        router.push('/auth/interests');
        break;
      case 'email-verification':
        Alert.alert(
          'Verify Your Email',
          'Please check your inbox and click the verification link to continue.',
          [{ text: 'OK' }]
        );
        break;
      default:
        console.log('Unknown step:', nextStep);
    }
  };

  return (
    <Box 
      className={`bg-primary-50 border border-primary-200 rounded-xl p-4 mx-4 my-2 ${className}`}
      style={style}
    >
      <HStack className="items-center justify-between">
        <HStack className="items-center gap-3 flex-1">
          <Text className="text-2xl">{stepInfo.icon}</Text>
          <VStack className="flex-1">
            <HStack className="items-center gap-2">
              <Text className="font-semibold text-primary-800">
                {completionPercentage}% Complete
              </Text>
              <Box className="flex-1 bg-primary-200 rounded-full h-2">
                <Box 
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </Box>
            </HStack>
            <Text className="text-sm text-primary-600 mt-1">
              {stepInfo.description}
            </Text>
          </VStack>
        </HStack>
        
        <VStack className="gap-2 ml-2">
          <Button
            size="sm"
            className="bg-primary-600"
            onPress={handleCompleteStep}
          >
            <ButtonText className="text-white font-medium">
              {stepInfo.action}
            </ButtonText>
          </Button>
          
          <Pressable 
            onPress={() => setDismissed(true)}
            className="self-center p-1"
          >
            <Text className="text-primary-400 text-xs">Dismiss</Text>
          </Pressable>
        </VStack>
      </HStack>
    </Box>
  );
}

/**
 * Compact version for navigation/header areas
 */
export function CompactProfileCompletion() {
  const { isComplete, completionPercentage, nextStep } = useOnboardingStatus();
  const stepInfo = useOnboardingStepInfo(nextStep || '');

  if (isComplete) return null;

  return (
    <Pressable 
      onPress={() => {
        if (nextStep === 'profile-setup' || nextStep === 'avatar-upload') {
          router.push('/auth/profile-setup');
        } else if (nextStep === 'interests-selection') {
          router.push('/auth/interests');
        }
      }}
      className="bg-primary-500 rounded-full px-3 py-1"
    >
      <HStack className="items-center gap-2">
        <Text className="text-white text-sm font-medium">
          {completionPercentage}%
        </Text>
        <Text className="text-white text-xs">Complete Profile</Text>
      </HStack>
    </Pressable>
  );
}
