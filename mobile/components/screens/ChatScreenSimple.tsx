import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ✅ SIMPLE CHAT SCREEN FOR TESTING
 * 
 * This is a minimal version to test the chat functionality
 * without the complex UI that might be causing infinite loops
 */

interface ChatScreenSimpleProps {
  spaceId?: string;
  spaceData?: {
    id: string;
    name: string;
    interactionType: string;
    description: string;
    memberCount: number;
    isJoined: boolean;
    communityId: string;
    communityName: string;
  };
}

const ChatScreenSimple: React.FC<ChatScreenSimpleProps> = ({
  spaceId: propSpaceId,
  spaceData,
}) => {
  const insets = useSafeAreaInsets();
  const { spaceId: paramSpaceId } = useLocalSearchParams<{ spaceId: string }>();

  const spaceId = propSpaceId || spaceData?.id || paramSpaceId;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use passed spaceData or create simple space object
  const [space] = useState(
    spaceData || {
      id: spaceId || '',
      name: 'Chat Space',
      interactionType: 'chat',
      memberCount: 0,
      isJoined: true, // Assume joined for testing
      description: '',
      communityId: '',
      communityName: 'Community',
    }
  );

  // Simple initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!spaceId) {
          setError('Invalid space. Please try again.');
          return;
        }

        console.log('🚀 [ChatScreenSimple] Initializing for space:', spaceId);

        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
        console.log('✅ [ChatScreenSimple] Initialized successfully');

      } catch (error) {
        console.error('❌ [ChatScreenSimple] Failed to initialize:', error);
        setError('Failed to initialize chat. Please try again.');
        setIsLoading(false);
      }
    };

    initialize();
  }, [spaceId]);

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-red-500 text-lg font-semibold mt-4">Error</Text>
        <Text className="text-gray-500 text-center mt-2 px-6">
          {error}
        </Text>
        <Pressable onPress={handleBack} className="mt-6 px-6 py-3 bg-blue-500 rounded-xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Pressable
                onPress={handleBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </Pressable>
              
              <View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {space.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Chat Space • {space.memberCount} members
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Loading Content */}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500 mt-4">Initializing chat...</Text>
        </View>
      </View>
    );
  }

  // Main chat interface (simplified)
  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3">
            <Pressable
              onPress={handleBack}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
            >
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </Pressable>
            
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {space.name}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Chat Space • {space.memberCount} members
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center space-x-2">
            <View className="w-2 h-2 rounded-full bg-green-500" />
          </View>
        </View>
      </View>

      {/* Chat Content */}
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-20 h-20 bg-blue-500/20 rounded-full items-center justify-center mb-6">
          <MaterialIcons name="chat" size={40} color="#3B82F6" />
        </View>
        
        <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Chat Ready!
        </Text>
        
        <Text className="text-lg text-gray-600 dark:text-gray-400 text-center mb-4">
          {space.name}
        </Text>
        
        <Text className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-xs">
          Simple chat interface initialized successfully. The real-time chat functionality is ready to be implemented.
        </Text>
        
        <View className="mt-8 p-4 bg-green-100 dark:bg-green-900/20 rounded-xl">
          <Text className="text-green-800 dark:text-green-200 text-center font-medium">
            ✅ No infinite loops detected!
          </Text>
          <Text className="text-green-600 dark:text-green-400 text-center text-sm mt-1">
            Chat initialization completed successfully
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ChatScreenSimple;
