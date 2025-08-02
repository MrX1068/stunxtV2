import React, { useRef, useEffect } from 'react';
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
import { Community } from '@/stores/posts';
import { useAuthStore } from '@/stores/auth';
import { formatNumber } from '@/utils/formatters';

interface CommunityCardProps {
  community: Community;
  onPress?: () => void;
  onJoinPress?: () => void;
  onLeavePress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
}

export function CommunityCard({
  community,
  onPress,
  onJoinPress,
  onLeavePress,
  variant = 'default',
  showActions = true,
}: CommunityCardProps) {
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

  const handleJoinToggle = () => {
    if (community.isJoined) {
      onLeavePress?.();
    } else {
      onJoinPress?.();
    }
  };

  // ✅ FIX: Smart join button logic based on ownership and privacy
  const getJoinButtonConfig = () => {
    // Get current user from auth store to check ownership
    const { user } = useAuthStore.getState();
    const currentUserId = user?.id;
    
    // Don't show join button if user owns the community (check both isOwner field and ownerId)
    if (community.isOwner || (currentUserId && community.ownerId === currentUserId)) {
      return { show: false, text: '', variant: 'solid' as const, disabled: false };
    }

    // User is already a member
    if (community.isJoined) {
      return { show: true, text: '✓ Joined', variant: 'outline' as const, disabled: false };
    }

    // Handle different privacy types
    switch (community.type) {
      case 'secret':
        // Secret communities are invite-only, don't show join button in discovery
        return { show: false, text: '', variant: 'solid' as const, disabled: false };
      
      case 'private':
        // Private communities require approval
        return { show: true, text: 'Request to Join', variant: 'solid' as const, disabled: false };
      
      case 'public':
      default:
        // Public communities allow direct joining
        return { show: true, text: 'Join', variant: 'solid' as const, disabled: false };
    }
  };

  const joinButtonConfig = getJoinButtonConfig();

  const getCommunityTypeColor = () => {
    switch (community.type) {
      case 'private': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'secret': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      default: return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    }
  };

  const renderCompact = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Box className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-3 shadow-sm">
          <HStack space="md" className="items-center">
            <Box className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl items-center justify-center shadow-lg">
              <Text size="xl" className="text-white font-semibold">
                {community?.name?.charAt(0)?.toUpperCase() || '🏛️'}
              </Text>
            </Box>
            
            <VStack className="flex-1">
              <HStack className="justify-between items-start">
                <VStack className="flex-1">
                  <Text size="md" className="font-semibold text-gray-900 dark:text-gray-100">
                    {community.name}
                  </Text>
                  <HStack space="xs" className="items-center mt-1">
                    <MaterialIcons name="people" size={14} color="#6B7280" />
                    <Text size="xs" className="text-gray-500 dark:text-gray-400">
                      {formatNumber(community.memberCount || 0)} members
                    </Text>
                    <Text size="xs" className="text-gray-300">•</Text>
                    <Box className={`px-2 py-0.5 rounded-full ${getCommunityTypeColor().bg} ${getCommunityTypeColor().border} border`}>
                      <Text size="xs" className={`font-medium ${getCommunityTypeColor().text}`}>
                        {community.type === 'private' ? 'Private' : community.type === 'secret' ? 'Secret' : 'Public'}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
                
                {community.isJoined && (
                  <Box className="w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </HStack>
            </VStack>
            
            {showActions && joinButtonConfig.show && (
              <Button
                size="sm"
                variant={joinButtonConfig.variant}
                onPress={handleJoinToggle}
                disabled={joinButtonConfig.disabled}
                className={`${community.isJoined 
                  ? 'border-primary-200 bg-primary-50' 
                  : community.type === 'private' 
                    ? 'bg-amber-600 shadow-md' 
                    : 'bg-primary-600 shadow-md'
                }`}
              >
                <ButtonText size="xs" className={
                  community.isJoined 
                    ? "text-primary-700" 
                    : "text-white"
                }>
                  {joinButtonConfig.text}
                </ButtonText>
              </Button>
            )}
          </HStack>
        </Box>
      </Pressable>
    </Animated.View>
  );

  const renderFeatured = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Box className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-700 rounded-2xl p-6 mb-4 shadow-xl">
          <VStack space="lg">
            <HStack space="lg" className="items-start">
              <Box className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl items-center justify-center shadow-2xl">
                <Text size="3xl" className="text-white font-bold">
                  {community?.name?.charAt(0)?.toUpperCase() || '⭐'}
                </Text>
              </Box>
              
              <VStack className="flex-1">
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <Text size="xl" className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {community.name}
                    </Text>
                    <Box className={`self-start px-3 py-1 rounded-full ${getCommunityTypeColor().bg} ${getCommunityTypeColor().border} border mt-2`}>
                      <Text size="xs" className={`font-semibold ${getCommunityTypeColor().text}`}>
                        {community.type === 'private' ? '🔒 Private' : community.type === 'secret' ? '🕵️ Secret' : '🌍 Public'}
                      </Text>
                    </Box>
                  </VStack>
                  
                  {community.isJoined && (
                    <Box className="bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                      <HStack space="xs" className="items-center">
                        <Box className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <Text size="xs" className="text-emerald-700 font-semibold">Member</Text>
                      </HStack>
                    </Box>
                  )}
                </HStack>
                
                <Text size="sm" className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                  {community.description}
                </Text>
              </VStack>
            </HStack>
            
            <HStack className="justify-between items-center">
              <HStack space="xl">
                <VStack className="items-center">
                  <HStack space="xs" className="items-center">
                    <MaterialIcons name="people" size={18} color="#6366F1" />
                    <Text size="lg" className="font-bold text-primary-700">
                      {formatNumber(community.memberCount || 0)}
                    </Text>
                  </HStack>
                  <Text size="xs" className="text-gray-500 font-medium">Members</Text>
                </VStack>
                <VStack className="items-center">
                  <HStack space="xs" className="items-center">
                    <MaterialIcons name="chat" size={18} color="#059669" />
                    <Text size="lg" className="font-bold text-emerald-600">
                      {formatNumber(community.messageCount || 0)}
                    </Text>
                  </HStack>
                  <Text size="xs" className="text-gray-500 font-medium">Messages</Text>
                </VStack>
                <VStack className="items-center">
                  <HStack space="xs" className="items-center">
                    <MaterialIcons name="trending-up" size={18} color="#DC2626" />
                    <Text size="lg" className="font-bold text-red-600">
                      {Math.floor(Math.random() * 50) + 1}
                    </Text>
                  </HStack>
                  <Text size="xs" className="text-gray-500 font-medium">Active</Text>
                </VStack>
              </HStack>
              
              {showActions && joinButtonConfig.show && (
                <Button
                  variant={joinButtonConfig.variant}
                  size="md"
                  onPress={handleJoinToggle}
                  disabled={joinButtonConfig.disabled}
                  className={`${community.isJoined 
                    ? 'border-2 border-primary-300 bg-white shadow-md' 
                    : community.type === 'private'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 shadow-xl'
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 shadow-xl'
                  } px-6`}
                >
                  <ButtonText className={
                    community.isJoined 
                      ? "text-primary-700 font-semibold" 
                      : "text-white font-semibold"
                  }>
                    {joinButtonConfig.text}
                  </ButtonText>
                </Button>
              )}
            </HStack>
          </VStack>
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
              <Box className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl items-center justify-center shadow-lg">
                <Text size="2xl" className="text-white font-bold">
                  {community?.name?.charAt(0)?.toUpperCase() || '👥'}
                </Text>
              </Box>
              
              <VStack className="flex-1">
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <Text size="lg" className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {community?.name}
                    </Text>
                    <HStack space="xs" className="items-center mt-2">
                      <Box className={`px-2 py-1 rounded-full ${getCommunityTypeColor().bg} ${getCommunityTypeColor().border} border`}>
                        <Text size="xs" className={`font-medium ${getCommunityTypeColor().text}`}>
                          {community.type === 'private' ? '🔒 Private' : community.type === 'secret' ? '🕵️ Secret' : '🌍 Public'}
                        </Text>
                      </Box>
                      {community.isJoined && (
                        <>
                          <Text size="xs" className="text-gray-300">•</Text>
                          <HStack space="xs" className="items-center">
                            <Box className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <Text size="xs" className="text-emerald-600 font-medium">Joined</Text>
                          </HStack>
                        </>
                      )}
                    </HStack>
                  </VStack>
                </HStack>
                
                <Text size="sm" className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                  {community.description}
                </Text>
              </VStack>
            </HStack>
            
            <HStack className="justify-between items-center">
              <HStack space="lg">
                <HStack space="xs" className="items-center">
                  <MaterialIcons name="people" size={16} color="#6366F1" />
                  <Text size="sm" className="text-gray-600 dark:text-gray-300 font-medium">
                    {formatNumber(community?.memberCount || 0)} members
                  </Text>
                </HStack>
                <HStack space="xs" className="items-center">
                  <MaterialIcons name="chat" size={16} color="#059669" />
                  <Text size="sm" className="text-gray-600 dark:text-gray-300 font-medium">
                    {formatNumber(community.messageCount || 0)} messages
                  </Text>
                </HStack>
                <HStack space="xs" className="items-center">
                  <MaterialIcons name="schedule" size={16} color="#DC2626" />
                  <Text size="sm" className="text-gray-600 dark:text-gray-300 font-medium">
                    {Math.floor(Math.random() * 24) + 1}h ago
                  </Text>
                </HStack>
              </HStack>
              
              {showActions && joinButtonConfig.show && (
                <Button
                  size="md"
                  variant={joinButtonConfig.variant}
                  onPress={handleJoinToggle}
                  disabled={joinButtonConfig.disabled}
                  className={`${community.isJoined 
                    ? 'border-primary-200 bg-primary-50 shadow-sm' 
                    : community.type === 'private'
                      ? 'bg-amber-600 shadow-lg'
                      : 'bg-primary-600 shadow-lg'
                  }`}
                >
                  <ButtonText 
                    size="sm" 
                    className={`font-semibold ${
                      community.isJoined 
                        ? "text-primary-700" 
                        : "text-white"
                    }`}
                  >
                    {joinButtonConfig.text}
                  </ButtonText>
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>
      </Pressable>
    </Animated.View>
  );

  switch (variant) {
    case 'compact':
      return renderCompact();
    case 'featured':
      return renderFeatured();
    default:
      return renderDefault();
  }
}
