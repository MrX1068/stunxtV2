import React, { useState, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useTheme } from '@/providers/ThemeProvider';
import { useCommunities, useSpaces } from '@/stores';
import type { CreateSpaceData } from '@/stores';

const spaceTypes = [
  { 
    id: 'text', 
    label: 'Text Channel', 
    icon: 'textsms' as const,
    description: 'Send messages, images, and files'
  },
  { 
    id: 'voice', 
    label: 'Voice Channel', 
    icon: 'mic' as const,
    description: 'Talk with voice'
  },
  { 
    id: 'video', 
    label: 'Video Channel', 
    icon: 'videocam' as const,
    description: 'Video calls and screen sharing'
  },
  { 
    id: 'announcement', 
    label: 'Announcement', 
    icon: 'campaign' as const,
    description: 'Important updates only'
  },
];

export default function CreateSpaceScreen() {
  const { isDark } = useTheme();
  const params = useLocalSearchParams();
  const communityId = params.communityId as string;
  
  const { joinedCommunities, ownedCommunities } = useCommunities();
  const { createSpace, isLoading, error } = useSpaces();
  
  const [formData, setFormData] = useState<CreateSpaceData>({
    name: '',
    description: '',
    communityId: communityId || '',
    type: 'text',
    isPrivate: false,
  });
  
  const [validationErrors, setValidationErrors] = useState<Partial<CreateSpaceData>>({});

  // Get available communities (joined + owned)
  const availableCommunities = [...new Set([...joinedCommunities, ...ownedCommunities])];

  useEffect(() => {
    if (communityId) {
      setFormData(prev => ({ ...prev, communityId }));
    }
  }, [communityId]);

  const validateForm = (): boolean => {
    const errors: Partial<CreateSpaceData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Space name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Space name must be at least 3 characters';
    }

    if (!formData.communityId) {
      errors.communityId = 'Please select a community';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const space = await createSpace(formData);
      router.back();
      // TODO: Navigate to the created space when space detail screen is ready
      console.log('Created space:', space.name);
      // router.push(`/space/${space.id}`);
    } catch (error) {
      console.warn('Failed to create space:', error);
    }
  };

  const updateFormData = (field: keyof CreateSpaceData, value: any) => {
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
              Create Space
            </Heading>
            
            <Box className="w-16" />
          </HStack>
        </Box>

        <VStack space="lg" className="p-6">
          {/* Community Selection */}
          {!communityId && availableCommunities.length > 0 && (
            <VStack space="sm">
              <Text size="md" className="font-medium text-typography-900">
                Community *
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <HStack space="md">
                  {availableCommunities.map((community) => (
                    <Button
                      key={community.id}
                      variant={formData.communityId === community.id ? "solid" : "outline"}
                      size="sm"
                      onPress={() => updateFormData('communityId', community.id)}
                      className="min-w-[120px]"
                    >
                      <VStack space="xs" className="items-center">
                        <Text size="lg">{community.avatar || '👥'}</Text>
                        <ButtonText size="xs">{community.name}</ButtonText>
                      </VStack>
                    </Button>
                  ))}
                </HStack>
              </ScrollView>
              {validationErrors.communityId && (
                <Text size="sm" className="text-error-600">
                  {validationErrors.communityId}
                </Text>
              )}
            </VStack>
          )}

          {/* Space Type */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Space Type
            </Text>
            <VStack space="md">
              {spaceTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={formData.type === type.id ? "solid" : "outline"}
                  onPress={() => updateFormData('type', type.id)}
                >
                  <HStack space="md" className="items-center">
                    <MaterialIcons 
                      name={type.icon} 
                      size={20} 
                      color={formData.type === type.id ? "#FFFFFF" : "#6B7280"} 
                    />
                    <VStack className="flex-1">
                      <ButtonText className={formData.type === type.id ? "text-white" : "text-typography-600"}>
                        {type.label}
                      </ButtonText>
                      <Text size="sm" className={formData.type === type.id ? "text-white opacity-80" : "text-typography-500"}>
                        {type.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Button>
              ))}
            </VStack>
          </VStack>

          {/* Space Name */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Space Name *
            </Text>
            <Input 
              variant="outline" 
              size="lg"
              isInvalid={!!validationErrors.name}
            >
              <InputField
                placeholder="Enter space name"
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

          {/* Description (Optional) */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Description (Optional)
            </Text>
            <Input variant="outline" size="lg">
              <InputField
                placeholder="Describe what this space is for..."
                value={formData.description || ''}
                onChangeText={(value: string) => updateFormData('description', value)}
                maxLength={200}
                multiline={true}
                numberOfLines={3}
              />
            </Input>
          </VStack>

          {/* Privacy Setting */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Privacy
            </Text>
            <VStack space="md">
              <Button
                variant={!formData.isPrivate ? "solid" : "outline"}
                onPress={() => updateFormData('isPrivate', false)}
              >
                <HStack space="md" className="items-center">
                  <MaterialIcons name="public" size={20} color={!formData.isPrivate ? "#FFFFFF" : "#6B7280"} />
                  <VStack className="flex-1">
                    <ButtonText className={!formData.isPrivate ? "text-white" : "text-typography-600"}>
                      Public
                    </ButtonText>
                    <Text size="sm" className={!formData.isPrivate ? "text-white opacity-80" : "text-typography-500"}>
                      All community members can access
                    </Text>
                  </VStack>
                </HStack>
              </Button>
              
              <Button
                variant={formData.isPrivate ? "solid" : "outline"}
                onPress={() => updateFormData('isPrivate', true)}
              >
                <HStack space="md" className="items-center">
                  <MaterialIcons name="lock" size={20} color={formData.isPrivate ? "#FFFFFF" : "#6B7280"} />
                  <VStack className="flex-1">
                    <ButtonText className={formData.isPrivate ? "text-white" : "text-typography-600"}>
                      Private
                    </ButtonText>
                    <Text size="sm" className={formData.isPrivate ? "text-white opacity-80" : "text-typography-500"}>
                      Only invited members can access
                    </Text>
                  </VStack>
                </HStack>
              </Button>
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
            disabled={isLoading || !formData.communityId}
          >
            <ButtonText className="font-semibold text-white">
              {isLoading ? "Creating..." : "Create Space"}
            </ButtonText>
          </Button>

          {availableCommunities.length === 0 && (
            <Box className="bg-warning-50 border border-warning-200 rounded-lg p-4 mt-4">
              <Text className="text-warning-700 text-center">
                You need to join or create a community first before creating spaces.
              </Text>
            </Box>
          )}
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
