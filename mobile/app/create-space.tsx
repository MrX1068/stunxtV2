import React, { useState, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
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
import { useTheme } from '@/providers/ThemeContext';
import { useCommunities, useSpaces } from '@/stores';
import type { CreateSpaceData } from '@/stores';

const spaceTypes = [
  { 
    id: 'public', 
    label: 'Public Space', 
    icon: 'public' as const,
    description: 'Anyone in the community can join and participate',
    color: 'emerald'
  },
  { 
    id: 'private', 
    label: 'Private Space', 
    icon: 'lock' as const,
    description: 'Only invited members can join and see content',
    color: 'amber'
  },
  { 
    id: 'secret', 
    label: 'Secret Space', 
    icon: 'visibility-off' as const,
    description: 'Hidden space, completely invisible to non-members',
    color: 'purple'
  },
];

const spaceCategories = [
  { id: 'general', label: 'General', icon: 'chat' as const, emoji: '💬' },
  { id: 'announcements', label: 'Announcements', icon: 'campaign' as const, emoji: '📢' },
  { id: 'discussion', label: 'Discussion', icon: 'forum' as const, emoji: '🗣️' },
  { id: 'projects', label: 'Projects', icon: 'work' as const, emoji: '🚀' },
  { id: 'support', label: 'Support', icon: 'help' as const, emoji: '💡' },
  { id: 'social', label: 'Social', icon: 'people' as const, emoji: '🎉' },
  { id: 'gaming', label: 'Gaming', icon: 'sports-esports' as const, emoji: '🎮' },
  { id: 'tech', label: 'Tech', icon: 'computer' as const, emoji: '💻' },
  { id: 'creative', label: 'Creative', icon: 'palette' as const, emoji: '🎨' },
  { id: 'education', label: 'Education', icon: 'school' as const, emoji: '📚' },
  { id: 'business', label: 'Business', icon: 'business' as const, emoji: '💼' },
  { id: 'entertainment', label: 'Entertainment', icon: 'movie' as const, emoji: '🎬' },
  { id: 'sports', label: 'Sports', icon: 'sports' as const, emoji: '⚽' },
  { id: 'news', label: 'News', icon: 'newspaper' as const, emoji: '📰' },
  { id: 'other', label: 'Other', icon: 'more-horiz' as const, emoji: '📁' },
];

const interactionTypes = [
  { 
    id: 'chat', 
    label: 'Chat Space', 
    icon: 'chat' as const,
    description: 'Real-time messaging and conversations',
    emoji: '💬'
  },
  { 
    id: 'post', 
    label: 'Post Space', 
    icon: 'article' as const,
    description: 'Announcements and feed-style posts',
    emoji: '📝'
  },
  { 
    id: 'forum', 
    label: 'Forum Space', 
    icon: 'forum' as const,
    description: 'Threaded discussions and topics',
    emoji: '🗨️'
  },
  { 
    id: 'feed', 
    label: 'Feed Space', 
    icon: 'dynamic-feed' as const,
    description: 'Social media style activity feed',
    emoji: '📱'
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
    type: 'public',
    category: 'general',
    interactionType: 'chat', // Add default interaction type
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
  
      // router.push(`/space/${space.id}`);
    } catch (error) {
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
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Enhanced Header */}
      <Box className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-12 pb-6 px-6 shadow-sm">
        <HStack className="justify-between items-center">
          <Button variant="link" size="sm" onPress={() => router.back()}>
            <HStack space="sm" className="items-center">
              <MaterialIcons name="arrow-back" size={20} color="#6366F1" />
              <Text className="text-primary-600 font-medium">Back</Text>
            </HStack>
          </Button>
          
          <VStack className="items-center">
            <Heading size="xl" className="font-bold text-gray-900 dark:text-gray-100">
              Create Space
            </Heading>
            <Text size="sm" className="text-gray-500 dark:text-gray-400">
              Build a focused discussion area
            </Text>
          </VStack>
          
          <Box className="w-16" />
        </HStack>
      </Box>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="p-6">
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
                        <Text size="lg">{community.avatarUrl ? '🏛️' : '👥'}</Text>
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

          {/* Space Category */}
          <VStack space="sm">
            <Text size="md" className="font-medium text-typography-900">
              Category
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <HStack space="md">
                {spaceCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={formData.category === category.id ? "solid" : "outline"}
                    size="sm"
                    onPress={() => updateFormData('category', category.id)}
                    className="min-w-[100px]"
                  >
                    <VStack space="xs" className="items-center">
                      <MaterialIcons 
                        name={category.icon} 
                        size={16} 
                        color={formData.category === category.id ? "#FFFFFF" : "#6B7280"} 
                      />
                      <ButtonText size="xs">{category.label}</ButtonText>
                    </VStack>
                  </Button>
                ))}
              </HStack>
            </ScrollView>
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
                variant={formData.type === 'public' ? "solid" : "outline"}
                onPress={() => updateFormData('type', 'public')}
              >
                <HStack space="md" className="items-center">
                  <MaterialIcons name="public" size={20} color={formData.type === 'public' ? "#FFFFFF" : "#6B7280"} />
                  <VStack className="flex-1">
                    <ButtonText className={formData.type === 'public' ? "text-white" : "text-typography-600"}>
                      Public
                    </ButtonText>
                    <Text size="sm" className={formData.type === 'public' ? "text-white opacity-80" : "text-typography-500"}>
                      All community members can access
                    </Text>
                  </VStack>
                </HStack>
              </Button>
              
              <Button
                variant={formData.type === 'private' ? "solid" : "outline"}
                onPress={() => updateFormData('type', 'private')}
              >
                <HStack space="md" className="items-center">
                  <MaterialIcons name="lock" size={20} color={formData.type === 'private' ? "#FFFFFF" : "#6B7280"} />
                  <VStack className="flex-1">
                    <ButtonText className={formData.type === 'private' ? "text-white" : "text-typography-600"}>
                      Private
                    </ButtonText>
                    <Text size="sm" className={formData.type === 'private' ? "text-white opacity-80" : "text-typography-500"}>
                      Only invited members can access
                    </Text>
                  </VStack>
                </HStack>
              </Button>

              <Button
                variant={formData.type === 'secret' ? "solid" : "outline"}
                onPress={() => updateFormData('type', 'secret')}
              >
                <HStack space="md" className="items-center">
                  <MaterialIcons name="visibility-off" size={20} color={formData.type === 'secret' ? "#FFFFFF" : "#6B7280"} />
                  <VStack className="flex-1">
                    <ButtonText className={formData.type === 'secret' ? "text-white" : "text-typography-600"}>
                      Secret
                    </ButtonText>
                    <Text size="sm" className={formData.type === 'secret' ? "text-white opacity-80" : "text-typography-500"}>
                      Hidden from community members
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
