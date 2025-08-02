import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { formatTime } from '@/utils/formatters';
import type { Space } from '@/stores';

interface SpaceCardProps {
  space: Space;
  onPress?: () => void;
  onJoinPress?: () => void;
  onLeavePress?: () => void;
  variant?: 'default' | 'compact';
  showCommunity?: boolean;
  showActions?: boolean;
}

const spaceIcons = {
  public: 'public',
  private: 'lock',
  secret: 'visibility-off',
} as const;

const categoryIcons = {
  general: 'chat',
  announcements: 'campaign',
  discussion: 'forum',
  projects: 'work',
  support: 'help',
  social: 'people',
  gaming: 'sports-esports',
  tech: 'computer',
  creative: 'palette',
  education: 'school',
  business: 'business',
  entertainment: 'movie',
  sports: 'sports',
  news: 'newspaper',
  other: 'more-horiz',
} as const;

export function SpaceCard({
  space,
  onPress,
  onJoinPress,
  onLeavePress,
  variant = 'default',
  showCommunity = false,
  showActions = true,
}: SpaceCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const getSpaceIcon = () => {
    return spaceIcons[space.type] || 'public';
  };

  const getCategoryIcon = () => {
    return categoryIcons[space.category as keyof typeof categoryIcons] || 'chat';
  };

  const getSpaceTypeColor = () => {
    switch (space.type) {
      case 'private': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'secret': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      default: return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    }
  };

  // Remove join toggle - users join from space detail screen
  const getInteractionTypeIcon = () => {
    switch (space.interactionType) {
      case 'chat': return 'chat';
      case 'post': return 'article';
      case 'forum': return 'forum';
      case 'feed': return 'dynamic-feed';
      default: return 'chat';
    }
  };

  const renderCompact = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Box className="bg-white dark:bg-gray-900 border-l-4 border-primary-500 rounded-r-xl p-4 mb-3 shadow-md">
          <HStack space="md" className="items-center">
            <Box className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg items-center justify-center">
              <MaterialIcons 
                name={getCategoryIcon()} 
                size={20} 
                color="#6366F1" 
              />
            </Box>
            
            <VStack className="flex-1">
              <HStack className="justify-between items-center">
                <VStack>
                  <Text size="md" className="font-semibold text-gray-900 dark:text-gray-100">
                    {space.name}
                  </Text>
                  <HStack space="xs" className="items-center mt-1">
                    <Box className={`px-2 py-0.5 rounded-full ${getSpaceTypeColor().bg} ${getSpaceTypeColor().border} border`}>
                      <Text size="xs" className={`font-medium ${getSpaceTypeColor().text}`}>
                        {space.type === 'private' ? '🔒' : space.type === 'secret' ? '🕵️' : '🌍'}
                      </Text>
                    </Box>
                    <Text size="xs" className="text-gray-400">•</Text>
                    <Text size="xs" className="text-gray-500 dark:text-gray-400 capitalize">
                      {space.category}
                    </Text>
                  </HStack>
                </VStack>
                
                {(space.unreadCount ?? 0) > 0 && (
                  <Box className="bg-red-500 px-2 py-1 rounded-full min-w-[24px] items-center shadow-sm">
                    <Text size="xs" className="text-white font-bold">
                      {(space.unreadCount ?? 0) > 99 ? '99+' : space.unreadCount}
                    </Text>
                  </Box>
                )}
              </HStack>
              
              {space.lastMessage && (
                <Box className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <Text size="xs" className="text-gray-600 dark:text-gray-300">
                    <Text className="font-medium text-primary-600">{space.lastMessage.authorName}:</Text> {space.lastMessage.content}
                  </Text>
                </Box>
              )}
            </VStack>
          </HStack>
        </Box>
      </Pressable>
    </Animated.View>
  );

  const renderDefault = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Box className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 mb-4 shadow-lg">
          <VStack space="lg">
            <HStack space="lg" className="items-start">
              <Box className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl items-center justify-center shadow-lg">
                <MaterialIcons 
                  name={getCategoryIcon()} 
                  size={24} 
                  color="white" 
                />
              </Box>
              
              <VStack className="flex-1">
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <Text size="lg" className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {space.name}
                    </Text>
                    {space.description && (
                      <Text size="sm" className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        {space.description}
                      </Text>
                    )}
                    
                    <HStack space="sm" className="items-center mt-3">
                      <Box className={`px-3 py-1 rounded-full ${getSpaceTypeColor().bg} ${getSpaceTypeColor().border} border`}>
                        <Text size="xs" className={`font-semibold ${getSpaceTypeColor().text}`}>
                          {space.type === 'private' ? '🔒 Private' : space.type === 'secret' ? '🕵️ Secret' : '🌍 Public'}
                        </Text>
                      </Box>
                      <Text size="xs" className="text-gray-300">•</Text>
                      <Text size="xs" className="text-gray-500 dark:text-gray-400 font-medium capitalize">
                        📁 {space.category}
                      </Text>
                    </HStack>
                  </VStack>
                  
                  <VStack className="items-end">
                    {(space.unreadCount ?? 0) > 0 && (
                      <Box className="bg-red-500 px-3 py-1 rounded-full min-w-[28px] items-center mb-2 shadow-md">
                        <Text size="xs" className="text-white font-bold">
                          {(space.unreadCount ?? 0) > 99 ? '99+' : space.unreadCount}
                        </Text>
                      </Box>
                    )}
                    
                    {space.isJoined && (
                      <Box className="bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-full">
                        <HStack space="xs" className="items-center">
                          <Box className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <Text size="xs" className="text-emerald-700 font-semibold">Joined</Text>
                        </HStack>
                      </Box>
                    )}
                  </VStack>
                </HStack>
              </VStack>
            </HStack>
            
            {space.lastMessage && (
              <Box className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <HStack space="sm" className="items-center mb-2">
                      <Box className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
                        <Text size="xs" className="text-primary-600 font-bold">
                          {space.lastMessage.authorName.charAt(0).toUpperCase()}
                        </Text>
                      </Box>
                      <Text size="sm" className="font-semibold text-gray-700 dark:text-gray-300">
                        {space.lastMessage.authorName}
                      </Text>
                    </HStack>
                    <Text size="sm" className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {space.lastMessage.content}
                    </Text>
                  </VStack>
                  <Text size="xs" className="text-gray-400 ml-3">
                    {formatTime(space.lastMessage.createdAt)}
                  </Text>
                </HStack>
              </Box>
            )}
            
            <HStack className="justify-between items-center">
              <HStack space="lg">
                {space.memberCount > 0 && (
                  <HStack space="xs" className="items-center">
                    <MaterialIcons name="people" size={16} color="#6366F1" />
                    <Text size="sm" className="text-gray-600 dark:text-gray-300 font-medium">
                      {space.memberCount} member{space.memberCount !== 1 ? 's' : ''}
                    </Text>
                  </HStack>
                )}
                
                <HStack space="xs" className="items-center">
                  <MaterialIcons name={getInteractionTypeIcon()} size={16} color="#059669" />
                  <Text size="sm" className="text-gray-600 dark:text-gray-300 font-medium capitalize">
                    {space.interactionType}
                  </Text>
                </HStack>
              </HStack>

              <HStack space="xs" className="items-center">
                <MaterialIcons name="arrow-forward-ios" size={16} color="#9CA3AF" />
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </Pressable>
    </Animated.View>
  );

  return variant === 'compact' ? renderCompact() : renderDefault();
}
