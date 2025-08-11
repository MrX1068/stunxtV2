import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '../ui/text';

interface SpaceHeaderProps {
  space: {
    id: string;
    name: string;
    interactionType: string;
    description?: string;
    memberCount: number;
    isJoined: boolean;
    communityId: string;
    communityName: string;
    ownerId?: string;
    memberRole?: string;
    type?: string;
  };
  showBackButton?: boolean;
  onBackPress?: () => void;
}

/**
 * ✅ CENTRALIZED SPACE HEADER COMPONENT
 * 
 * Features:
 * - Clickable header that navigates to space info screen
 * - Consistent design across ChatScreen and PostScreen
 * - Optimized navigation with data passing (no API calls)
 * - Visual indicators (info icon, tap hint)
 * - Professional Telegram/WhatsApp style
 */

export function SpaceHeader({ 
  space, 
  showBackButton = true, 
  onBackPress 
}: SpaceHeaderProps) {
  
  const handleSpaceInfoPress = () => {
    router.push({
      pathname: `/space-info/${space.communityId}/${space.id}` as any,
      params: { spaceData: JSON.stringify(space) }
    });
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const getSpaceTypeIcon = () => {
    switch (space.interactionType) {
      case 'chat':
        return 'chat';
      case 'post':
      case 'forum':
      case 'feed':
        return 'article';
      default:
        return 'chat';
    }
  };

  const getSpaceTypeLabel = () => {
    switch (space.interactionType) {
      case 'chat':
        return 'Chat Space';
      case 'post':
        return 'Post Space';
      case 'forum':
        return 'Forum Space';
      case 'feed':
        return 'Feed Space';
      default:
        return 'Space';
    }
  };

  return (
    <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center px-4 py-3">
        {/* Back Button */}
        {showBackButton && (
          <Pressable
            onPress={handleBackPress}
            className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </Pressable>
        )}

        {/* ✅ CLICKABLE SPACE INFO - Tap to navigate to dedicated info screen */}
        <Pressable
          onPress={handleSpaceInfoPress}
          className="flex-1 active:scale-[0.98] active:opacity-80"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {space.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <MaterialIcons 
                  name={getSpaceTypeIcon() as any} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  {getSpaceTypeLabel()} • {space.memberCount} members
                </Text>
              </View>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Tap for space info & member management
              </Text>
            </View>
            
            {/* Info Icon Hint */}
            <MaterialIcons name="info-outline" size={20} color="#6B7280" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
