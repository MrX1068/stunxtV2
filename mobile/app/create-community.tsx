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
import { useTheme } from '@/providers/ThemeProvider';
import { useCommunities } from '@/stores';
import type { CreateCommunityData } from '@/stores';

const categories = [
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'art', label: 'Art & Design', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'food', label: 'Food & Cooking', icon: '🍳' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'other', label: 'Other', icon: '📂' },
];

export default function CreateCommunityScreen() {
  const { isDark } = useTheme();
  const { createCommunity, isLoading, error } = useCommunities();
  
  const [formData, setFormData] = useState<CreateCommunityData>({
    name: '',
    description: '',
    category: '',
    isPrivate: false,
    rules: [],
  });
  
  const [validationErrors, setValidationErrors] = useState<Partial<CreateCommunityData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<CreateCommunityData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Community name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category) {
      errors.category = 'Please select a category';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const community = await createCommunity(formData);
      router.back();
      // Navigate to the created community
      router.push(`/community/${community.id}`);
    } catch (error) {
      console.warn('Failed to create community:', error);
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

          {/* Category Selection */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Category *
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <HStack space="md">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={formData.category === category.id ? "solid" : "outline"}
                    size="sm"
                    onPress={() => updateFormData('category', category.id)}
                    className="min-w-[100px]"
                  >
                    <VStack space="xs" className="items-center">
                      <Text size="lg">{category.icon}</Text>
                      <ButtonText size="xs">{category.label}</ButtonText>
                    </VStack>
                  </Button>
                ))}
              </HStack>
            </ScrollView>
            {validationErrors.category && (
              <Text size="sm" className="text-error-600">
                {validationErrors.category}
              </Text>
            )}
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
                      Anyone can find and join
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
                      Invite only
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
