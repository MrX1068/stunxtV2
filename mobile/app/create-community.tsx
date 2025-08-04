import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeContext';
import { useCommunities } from '@/stores';
import type { CreateCommunityData } from '@/stores';

const communityTypes = [
  { 
    id: 'public' as const, 
    label: 'Public', 
    icon: '🌍',
    description: 'Anyone can discover and join this community'
  },
  { 
    id: 'private' as const, 
    label: 'Private', 
    icon: '�',
    description: 'People must request to join or be invited'
  },
  { 
    id: 'secret' as const, 
    label: 'Secret', 
    icon: '🕵️',
    description: 'Only visible to members, invite-only'
  },
];

const interactionTypes = [
  { 
    id: 'hybrid' as const, 
    label: 'Hybrid', 
    icon: '🔄',
    description: 'Both posts and real-time chat'
  },
  { 
    id: 'post' as const, 
    label: 'Posts', 
    icon: '📝',
    description: 'Feed-style posts with reactions'
  },
  { 
    id: 'chat' as const, 
    label: 'Chat', 
    icon: '�',
    description: 'Real-time messaging only'
  },
];

export default function CreateCommunityScreen() {
  const { isDark } = useTheme();
  const { createCommunity, isLoading, error } = useCommunities();
  
  const [formData, setFormData] = useState<CreateCommunityData>({
    name: '',
    description: '',
    type: 'public',
    interactionType: 'hybrid',
  });
  
  const [validationErrors, setValidationErrors] = useState<Partial<CreateCommunityData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<CreateCommunityData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Community name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Community name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const community = await createCommunity(formData);
      // Navigate to the created community directly, this will replace the current screen
      router.replace(`/community/${community.id}`);
    } catch (error) {
    }
  };

  const updateFormData = (field: keyof CreateCommunityData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView className="flex-1 bg-background-0">
        {/* Header */}
        <Box className="bg-background-0 border-b border-outline-200 pt-12 pb-4 px-6">
          <HStack className="justify-between items-center">
            <Button variant="link" size="sm" onPress={() => router.back()}>
              <HStack space="xs" className="items-center">
                <MaterialIcons name="arrow-back" size={20} color="#6366F1" />
                <Text className="text-primary-600">Back</Text>
              </HStack>
            </Button>
            
            <Heading size="lg" className="font-bold text-typography-900">
              Create Community
            </Heading>
            
            <Box className="w-16" />
          </HStack>
        </Box>

        <VStack space="lg" className="p-6">
          {/* Community Name */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Community Name *
            </Text>
            <Input 
              variant="outline" 
              size="lg"
              isInvalid={!!validationErrors.name}
            >
              <InputField
                placeholder="Enter community name"
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                maxLength={50}
              />
            </Input>
            {validationErrors.name && (
              <Text size="sm" className="text-error-600">
                {validationErrors.name}
              </Text>
            )}
          </VStack>

          {/* Description */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Description *
            </Text>
            <Input 
              variant="outline" 
              size="lg"
              isInvalid={!!validationErrors.description}
            >
              <InputField
                placeholder="Describe what your community is about..."
                value={formData.description}
                onChangeText={(value: string) => updateFormData('description', value)}
                maxLength={500}
                multiline={true}
                numberOfLines={4}
              />
            </Input>
            {validationErrors.description && (
              <Text size="sm" className="text-error-600">
                {validationErrors.description}
              </Text>
            )}
          </VStack>

          {/* Community Type Selection */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Community Type *
            </Text>
            <Text size="sm" className="text-typography-600 mb-2">
              Choose who can discover and join your community
            </Text>
            <VStack space="md">
              {communityTypes.map((communityType) => (
                <Button
                  key={communityType.id}
                  variant={formData.type === communityType.id ? "solid" : "outline"}
                  size="md"
                  onPress={() => updateFormData('type', communityType.id)}
                  className="p-4"
                >
                  <HStack space="md" className="items-center flex-1">
                    <Text size="xl">{communityType.icon}</Text>
                    <VStack className="flex-1 items-start">
                      <ButtonText size="md" className={formData.type === communityType.id ? "text-white" : "text-typography-700"}>
                        {communityType.label}
                      </ButtonText>
                      <Text 
                        size="sm" 
                        className={formData.type === communityType.id ? "text-white opacity-80" : "text-typography-500"}
                      >
                        {communityType.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Button>
              ))}
            </VStack>
          </VStack>

          {/* Interaction Type Selection */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Interaction Type
            </Text>
            <Text size="sm" className="text-typography-600 mb-2">
              How do you want members to interact?
            </Text>
            <VStack space="md">
              {interactionTypes.map((interactionType) => (
                <Button
                  key={interactionType.id}
                  variant={formData.interactionType === interactionType.id ? "solid" : "outline"}
                  size="md"
                  onPress={() => updateFormData('interactionType', interactionType.id)}
                  className="p-4"
                >
                  <HStack space="md" className="items-center flex-1">
                    <Text size="xl">{interactionType.icon}</Text>
                    <VStack className="flex-1 items-start">
                      <ButtonText size="md" className={formData.interactionType === interactionType.id ? "text-white" : "text-typography-700"}>
                        {interactionType.label}
                      </ButtonText>
                      <Text 
                        size="sm" 
                        className={formData.interactionType === interactionType.id ? "text-white opacity-80" : "text-typography-500"}
                      >
                        {interactionType.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Button>
              ))}
            </VStack>
          </VStack>

          {/* Error Display */}
          {error && (
            <Box className="bg-error-50 border border-error-200 rounded-lg p-4">
              <Text className="text-error-600 text-center">{error}</Text>
            </Box>
          )}

          {/* Submit Button */}
          <Button
            size="lg"
            className="w-full mt-6"
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <ButtonText className="font-semibold text-white">
              {isLoading ? "Creating..." : "Create Community"}
            </ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
